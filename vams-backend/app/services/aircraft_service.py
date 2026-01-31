"""
Aircraft service layer with FSM enforcement.
All aircraft state changes must be validated before persistence.
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.db.models.aircraft import Aircraft
from app.db.models.audit import AuditLog
from app.core.fsm.aircraft_fsm import AircraftFSM, AircraftState, AircraftFSMViolation
from app.core.events import EventLogger, EventType, EventSeverity
from fastapi import HTTPException, status


class AircraftService:
    """Business logic for aircraft operations"""
    
    @staticmethod
    def register_aircraft(
        db: Session,
        tail_number: str,
        aircraft_type: str,
        operator: str,
        weight_kg: float,
        max_range_km: float,
        battery_level: Optional[float] = None,
    ) -> Aircraft:
        """
        Register a new aircraft in the system.
        
        Args:
            db: Database session
            tail_number: Unique aircraft identifier
            aircraft_type: Type/model of aircraft
            operator: Operating organization
            weight_kg: Aircraft weight
            max_range_km: Maximum range
            battery_level: Initial battery level (optional)
            
        Returns:
            Created aircraft entity
            
        Raises:
            HTTPException: If tail number already exists
        """
        # Check for duplicate
        existing = db.query(Aircraft).filter(
            Aircraft.tail_number == tail_number
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Aircraft {tail_number} already registered",
            )
        
        # Create aircraft
        aircraft = Aircraft(
            tail_number=tail_number,
            aircraft_type=aircraft_type,
            operator=operator,
            weight_kg=weight_kg,
            max_range_km=max_range_km,
            battery_level=battery_level,
            state=AircraftState.REGISTERED,
            is_emergency=False,
        )
        
        db.add(aircraft)
        db.flush()
        
        # Log event
        event = EventLogger.create_event(
            event_type=EventType.AIRCRAFT_REGISTERED,
            severity=EventSeverity.INFO,
            entity_type="aircraft",
            entity_id=aircraft.id,
            details={
                "tail_number": tail_number,
                "aircraft_type": aircraft_type,
                "operator": operator,
            },
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
        db.refresh(aircraft)
        
        return aircraft
    
    @staticmethod
    def transition_aircraft_state(
        db: Session,
        aircraft_id: str,
        target_state: AircraftState,
        operator_id: Optional[str] = None,
    ) -> Aircraft:
        """
        Transition aircraft to new state with FSM validation.
        
        Args:
            db: Database session
            aircraft_id: Aircraft identifier
            target_state: Desired target state
            operator_id: Operator initiating transition
            
        Returns:
            Updated aircraft entity
            
        Raises:
            HTTPException: If aircraft not found or transition invalid
        """
        aircraft = db.query(Aircraft).filter(Aircraft.id == aircraft_id).first()
        
        if not aircraft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aircraft {aircraft_id} not found",
            )
        
        current_state = aircraft.state
        
        # Validate FSM transition
        try:
            AircraftFSM.validate_transition(current_state, target_state)
        except AircraftFSMViolation as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        
        # Update state
        aircraft.state = target_state
        
        # Set emergency flag
        if target_state == AircraftState.EMERGENCY:
            aircraft.is_emergency = True
        elif current_state == AircraftState.EMERGENCY:
            aircraft.is_emergency = False
        
        db.flush()
        
        # Log event
        event = EventLogger.create_event(
            event_type=EventType.AIRCRAFT_STATE_CHANGED,
            severity=EventSeverity.WARNING if target_state == AircraftState.EMERGENCY else EventSeverity.INFO,
            entity_type="aircraft",
            entity_id=aircraft.id,
            details={
                "tail_number": aircraft.tail_number,
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
        db.refresh(aircraft)
        
        return aircraft
    
    @staticmethod
    def update_battery_level(
        db: Session,
        aircraft_id: str,
        battery_level: float,
    ) -> Aircraft:
        """Update aircraft battery level"""
        aircraft = db.query(Aircraft).filter(Aircraft.id == aircraft_id).first()
        
        if not aircraft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aircraft {aircraft_id} not found",
            )
        
        if not 0 <= battery_level <= 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Battery level must be between 0 and 100",
            )
        
        aircraft.battery_level = battery_level
        db.commit()
        db.refresh(aircraft)
        
        return aircraft
    
    @staticmethod
    def update_position(
        db: Session,
        aircraft_id: str,
        latitude: float,
        longitude: float,
        altitude_m: float,
    ) -> Aircraft:
        """Update aircraft position"""
        aircraft = db.query(Aircraft).filter(Aircraft.id == aircraft_id).first()
        
        if not aircraft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aircraft {aircraft_id} not found",
            )
        
        aircraft.last_latitude = latitude
        aircraft.last_longitude = longitude
        aircraft.last_altitude_m = altitude_m
        aircraft.last_position_update = datetime.utcnow()
        
        db.commit()
        db.refresh(aircraft)
        
        return aircraft
    
    @staticmethod
    def get_aircraft(db: Session, aircraft_id: str) -> Aircraft:
        """Get aircraft by ID"""
        aircraft = db.query(Aircraft).filter(Aircraft.id == aircraft_id).first()
        
        if not aircraft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aircraft {aircraft_id} not found",
            )
        
        return aircraft
    
    @staticmethod
    def get_aircraft_by_tail(db: Session, tail_number: str) -> Aircraft:
        """Get aircraft by tail number"""
        aircraft = db.query(Aircraft).filter(
            Aircraft.tail_number == tail_number
        ).first()
        
        if not aircraft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aircraft {tail_number} not found",
            )
        
        return aircraft
    
    @staticmethod
    def list_aircraft(
        db: Session,
        state: Optional[AircraftState] = None,
        is_emergency: Optional[bool] = None,
    ) -> List[Aircraft]:
        """List all aircraft with optional filters"""
        query = db.query(Aircraft)
        
        if state:
            query = query.filter(Aircraft.state == state)
        
        if is_emergency is not None:
            query = query.filter(Aircraft.is_emergency == is_emergency)
        
        return query.all()