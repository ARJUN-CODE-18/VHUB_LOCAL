"""
Vertipad service layer with FSM enforcement.
All pad state changes must be validated before persistence.
"""
from sqlalchemy.orm import Session
from typing import Optional
import logging
from app.db.models.vertipad import Vertipad
from app.db.models.aircraft import Aircraft
from app.db.models.audit import AuditLog
from app.core.fsm.vertipad_fsm import VertipadFSM, VertipadState, VertipadFSMViolation
from app.core.events import EventLogger, EventType, EventSeverity
from app.core.pad_catalog import STATIC_PAD_DEFINITIONS, STATIC_PAD_IDS
from app.core.priority import PriorityLevel
from app.services.pad_queue_service import PadQueueService
from fastapi import HTTPException, status


logger = logging.getLogger(__name__)


class PadService:
    """Business logic for vertipad operations"""

    @staticmethod
    def _assign_aircraft_to_pad(db: Session, pad: Vertipad, aircraft_id: str) -> bool:
        aircraft = db.query(Aircraft).filter(Aircraft.id == aircraft_id).first()
        if not aircraft:
            return False

        if aircraft.pad_id and aircraft.pad_id != pad.id:
            previous_pad = db.query(Vertipad).filter(Vertipad.id == aircraft.pad_id).first()
            if previous_pad and previous_pad.current_aircraft_id == aircraft_id:
                previous_pad.current_aircraft_id = None
                previous_pad.state = VertipadState.AVAILABLE
                previous_pad.status = VertipadState.AVAILABLE.value

        if pad.state != VertipadState.OCCUPIED:
            VertipadFSM.validate_transition(pad.state, VertipadState.OCCUPIED)

        pad.state = VertipadState.OCCUPIED
        pad.status = VertipadState.OCCUPIED.value
        pad.current_aircraft_id = aircraft_id
        aircraft.pad_id = pad.id
        PadQueueService.remove_aircraft(aircraft_id)
        return True

    @staticmethod
    def _assign_next_from_queue(db: Session, pad: Vertipad) -> None:
        next_entry = PadQueueService.pop_next_aircraft(pad.id)
        while next_entry:
            if PadService._assign_aircraft_to_pad(db, pad, next_entry["aircraft_id"]):
                return
            next_entry = PadQueueService.pop_next_aircraft(pad.id)

    @staticmethod
    def _handle_critical_override(db: Session, pad: Vertipad, aircraft_id: str) -> None:
        current_aircraft_id = pad.current_aircraft_id
        if current_aircraft_id and current_aircraft_id != aircraft_id:
            displaced = db.query(Aircraft).filter(Aircraft.id == current_aircraft_id).first()
            if displaced and displaced.pad_id == pad.id:
                displaced.pad_id = None
            PadQueueService.add_to_queue(
                pad_id=pad.id,
                aircraft_id=current_aircraft_id,
                priority=PriorityLevel.NORMAL,
            )

        pad.current_aircraft_id = None
        pad.state = VertipadState.AVAILABLE
        pad.status = VertipadState.AVAILABLE.value
        PadService._assign_aircraft_to_pad(db, pad, aircraft_id)

    @staticmethod
    def _validate_known_pad_id(pad_id: str) -> None:
        if pad_id not in STATIC_PAD_IDS:
            logger.warning("Invalid pad_id rejected: %s", pad_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid pad_id: {pad_id}",
            )
    
    @staticmethod
    def initialize_pad(
        db: Session,
        pad_id: str,
        name: str,
        latitude: float,
        longitude: float,
        elevation_m: float,
        diameter_m: float,
        max_weight_kg: float,
        charging_power_kw: Optional[float] = None,
    ) -> Vertipad:
        """Initialize static vertipad definitions only."""
        PadService._validate_known_pad_id(pad_id)

        existing = db.query(Vertipad).filter(Vertipad.id == pad_id).first()
        if existing:
            return existing

        definition = STATIC_PAD_DEFINITIONS[pad_id]

        pad = Vertipad(
            id=pad_id,
            name=definition["name"],
            latitude=definition["latitude"],
            longitude=definition["longitude"],
            elevation_m=definition["elevation_m"],
            diameter_m=definition["diameter_m"],
            max_weight_kg=definition["max_weight_kg"],
            state=VertipadState.AVAILABLE,
            status=VertipadState.AVAILABLE.value,
            has_charging=definition["charging_power_kw"] is not None,
            charging_power_kw=definition["charging_power_kw"],
            is_operational=True,
        )
        
        db.add(pad)
        db.commit()
        db.refresh(pad)
        
        return pad
    
    @staticmethod
    def transition_pad_state(
        db: Session,
        pad_id: str,
        target_state: VertipadState,
        operator_id: Optional[str] = None,
    ) -> Vertipad:
        """
        Transition pad to new state with FSM validation.
        
        Args:
            db: Database session
            pad_id: Vertipad identifier
            target_state: Desired target state
            operator_id: Operator initiating transition
            
        Returns:
            Updated vertipad entity
            
        Raises:
            HTTPException: If pad not found or transition invalid
        """
        PadService._validate_known_pad_id(pad_id)
        pad = db.query(Vertipad).filter(Vertipad.id == pad_id).first()
        
        if not pad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vertipad {pad_id} not found",
            )
        
        current_state = pad.state
        
        # Validate FSM transition
        try:
            VertipadFSM.validate_transition(current_state, target_state)
        except VertipadFSMViolation as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        
        # Update state
        pad.state = target_state
        pad.status = target_state.value
        
        # Update operational status
        if target_state in [VertipadState.OFFLINE, VertipadState.EMERGENCY_LOCKED]:
            pad.is_operational = False
        elif target_state == VertipadState.AVAILABLE:
            pad.is_operational = True
        
        # Clear occupancy if transitioning to available
        if target_state == VertipadState.AVAILABLE:
            if pad.current_aircraft_id:
                aircraft = db.query(Aircraft).filter(Aircraft.id == pad.current_aircraft_id).first()
                if aircraft and aircraft.pad_id == pad.id:
                    aircraft.pad_id = None
            pad.current_aircraft_id = None
            PadService._assign_next_from_queue(db, pad)
        
        db.flush()
        
        # Log event
        event = EventLogger.create_event(
            event_type=EventType.PAD_STATE_CHANGED,
            severity=EventSeverity.WARNING if target_state == VertipadState.EMERGENCY_LOCKED else EventSeverity.INFO,
            entity_type="vertipad",
            entity_id=pad.id,
            details={
                "from_state": current_state,
                "to_state": target_state,
            },
            operator_id=operator_id,
        )
        
        audit_log = AuditLog(
            event_type=event.event_type,
            severity=event.severity,
            timestamp=event.timestamp,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            details=event.to_json(),
            operator_id=operator_id,
        )
        db.add(audit_log)
        db.commit()
        db.refresh(pad)
        
        return pad
    
    @staticmethod
    def occupy_pad(
        db: Session,
        pad_id: str,
        aircraft_id: str,
        priority: PriorityLevel = PriorityLevel.NORMAL,
    ) -> Vertipad:
        """Mark pad as occupied by aircraft"""
        PadService._validate_known_pad_id(pad_id)
        pad = db.query(Vertipad).filter(Vertipad.id == pad_id).first()
        
        if not pad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vertipad {pad_id} not found",
            )
        
        if pad.state not in [VertipadState.RESERVED, VertipadState.AVAILABLE, VertipadState.OCCUPIED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Pad {pad_id} is not available for occupation (state: {pad.state})",
            )

        if pad.current_aircraft_id and pad.current_aircraft_id != aircraft_id:
            if priority == PriorityLevel.CRITICAL:
                PadService._handle_critical_override(db=db, pad=pad, aircraft_id=aircraft_id)
                db.commit()
                db.refresh(pad)
                return pad

            PadQueueService.add_to_queue(
                pad_id=pad_id,
                aircraft_id=aircraft_id,
                priority=priority,
            )
            db.commit()
            db.refresh(pad)
            return pad

        aircraft = db.query(Aircraft).filter(Aircraft.id == aircraft_id).first()
        if not aircraft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aircraft {aircraft_id} not found",
            )

        # Transition to occupied and bind aircraft.
        try:
            PadService._assign_aircraft_to_pad(db, pad, aircraft_id)
        except VertipadFSMViolation as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        
        db.commit()
        db.refresh(pad)

        return pad

    @staticmethod
    def release_pad(
        db: Session,
        pad_id: str,
    ) -> Vertipad:
        """Release pad back to available state"""
        PadService._validate_known_pad_id(pad_id)
        pad = db.query(Vertipad).filter(Vertipad.id == pad_id).first()
        if not pad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vertipad {pad_id} not found",
            )

        # Transition to available
        try:
            VertipadFSM.validate_transition(pad.state, VertipadState.AVAILABLE)
        except VertipadFSMViolation as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        
        pad.state = VertipadState.AVAILABLE
        pad.status = VertipadState.AVAILABLE.value
        if pad.current_aircraft_id:
            aircraft = db.query(Aircraft).filter(Aircraft.id == pad.current_aircraft_id).first()
            if aircraft and aircraft.pad_id == pad_id:
                aircraft.pad_id = None
        pad.current_aircraft_id = None

        PadService._assign_next_from_queue(db, pad)
        
        # Log event
        event = EventLogger.create_event(
            event_type=EventType.PAD_RELEASED,
            severity=EventSeverity.INFO,
            entity_type="vertipad",
            entity_id=pad.id,
            details={"released": True},
        )
        
        audit_log = AuditLog(
            event_type=event.event_type,
            severity=event.severity,
            timestamp=event.timestamp,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            details=event.to_json(),
    )
        db.add(audit_log)
        
        db.commit()
        db.refresh(pad)

        return pad
    
    @staticmethod
    def list_pads(db: Session) -> list[Vertipad]:
        """List all vertipads"""
        return (
            db.query(Vertipad)
            .filter(Vertipad.id.in_(STATIC_PAD_IDS))
            .order_by(Vertipad.id.asc())
            .all()
        )


    @staticmethod
    def get_pad(db: Session, pad_id: str) -> Vertipad:
        """Get vertipad by ID"""
        PadService._validate_known_pad_id(pad_id)
        pad = db.query(Vertipad).filter(Vertipad.id == pad_id).first()
        
        if not pad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vertipad {pad_id} not found",
            )
        
        return pad