"""
Vertipad service layer with FSM enforcement.
All pad state changes must be validated before persistence.
"""
from sqlalchemy.orm import Session
from typing import Optional
from app.db.models.vertipad import Vertipad
from app.db.models.audit import AuditLog
from app.core.fsm.vertipad_fsm import VertipadFSM, VertipadState, VertipadFSMViolation
from app.core.events import EventLogger, EventType, EventSeverity
from fastapi import HTTPException, status


class PadService:
    """Business logic for vertipad operations"""
    
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
        """Initialize vertipad configuration"""
        existing = db.query(Vertipad).filter(Vertipad.id == pad_id).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Vertipad {pad_id} already exists",
            )
        
        pad = Vertipad(
            id=pad_id,
            name=name,
            latitude=latitude,
            longitude=longitude,
            elevation_m=elevation_m,
            diameter_m=diameter_m,
            max_weight_kg=max_weight_kg,
            state=VertipadState.AVAILABLE,
            has_charging=charging_power_kw is not None,
            charging_power_kw=charging_power_kw,
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
        
        # Update operational status
        if target_state in [VertipadState.OFFLINE, VertipadState.EMERGENCY_LOCKED]:
            pad.is_operational = False
        elif target_state == VertipadState.AVAILABLE:
            pad.is_operational = True
        
        # Clear occupancy if transitioning to available
        if target_state == VertipadState.AVAILABLE:
            pad.current_aircraft_id = None
        
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
    ) -> Vertipad:
        """Mark pad as occupied by aircraft"""
        pad = db.query(Vertipad).filter(Vertipad.id == pad_id).first()
        
        if not pad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vertipad {pad_id} not found",
            )
        
        if pad.state not in [VertipadState.RESERVED, VertipadState.AVAILABLE]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Pad {pad_id} is not available for occupation (state: {pad.state})",
            )
        
        # Transition to occupied
        try:
            VertipadFSM.validate_transition(pad.state, VertipadState.OCCUPIED)
        except VertipadFSMViolation as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        
        pad.state = VertipadState.OCCUPIED
        pad.current_aircraft_id = aircraft_id
        
        db.commit()
        db.refresh(pad)

        return pad

    @staticmethod
    def release_pad(
        db: Session,
        pad_id: str,
    ) -> Vertipad:
        """Release pad back to available state"""
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
        pad.current_aircraft_id = None
        
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
        return db.query(Vertipad).all()


    @staticmethod
    def get_pad(db: Session, pad_id: str) -> Vertipad:
        """Get vertipad by ID"""
        pad = db.query(Vertipad).filter(Vertipad.id == pad_id).first()
        
        if not pad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vertipad {pad_id} not found",
            )
        
        return pad