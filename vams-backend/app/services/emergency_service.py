"""
Emergency service layer for critical safety operations.
Emergency state overrides all FSMs and triggers immediate actions.
"""
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.db.models.aircraft import Aircraft
from app.db.models.vertipad import Vertipad
from app.db.models.workflow import Workflow
from app.db.models.audit import AuditLog
from app.core.fsm.aircraft_fsm import AircraftState
from app.core.fsm.vertipad_fsm import VertipadState
from app.core.fsm.workflow_fsm import WorkflowState
from app.core.events import EventLogger, EventType, EventSeverity
from app.services.aircraft_service import AircraftService
from app.services.pad_service import PadService
from app.services.workflow_service import WorkflowService
from fastapi import HTTPException, status


class EmergencyService:
    """Business logic for emergency operations"""
    
    @staticmethod
    def declare_aircraft_emergency(
        db: Session,
        aircraft_id: str,
        emergency_type: str,
        description: str,
        operator_id: Optional[str] = None,
    ) -> Aircraft:
        """
        Declare emergency for aircraft.
        This triggers immediate state transitions and aborts active workflows.
        
        Args:
            db: Database session
            aircraft_id: Aircraft in emergency
            emergency_type: Type of emergency (e.g., mechanical, medical, weather)
            description: Detailed description
            operator_id: Operator declaring emergency
            
        Returns:
            Updated aircraft entity
        """
        # Transition aircraft to emergency state
        aircraft = AircraftService.transition_aircraft_state(
            db=db,
            aircraft_id=aircraft_id,
            target_state=AircraftState.EMERGENCY,
            operator_id=operator_id,
        )
        
        # Abort any active workflows
        active_workflow = WorkflowService.get_active_workflow(db, aircraft_id)
        if active_workflow:
            active_workflow.state = WorkflowState.EMERGENCY_ABORTED
            active_workflow.is_emergency = True
            active_workflow.completed_at = datetime.utcnow()
            active_workflow.completion_notes = f"Emergency: {emergency_type} - {description}"
            db.add(active_workflow)
        
        # Log critical event
        event = EventLogger.create_event(
            event_type=EventType.EMERGENCY_DECLARED,
            severity=EventSeverity.CRITICAL,
            entity_type="aircraft",
            entity_id=aircraft_id,
            details={
                "emergency_type": emergency_type,
                "description": description,
                "tail_number": aircraft.tail_number,
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
    def clear_aircraft_emergency(
        db: Session,
        aircraft_id: str,
        resolution: str,
        operator_id: Optional[str] = None,
    ) -> Aircraft:
        """
        Clear aircraft emergency and transition to safe state.
        
        Args:
            db: Database session
            aircraft_id: Aircraft to clear
            resolution: How emergency was resolved
            operator_id: Operator clearing emergency
            
        Returns:
            Updated aircraft entity
        """
        aircraft = db.query(Aircraft).filter(Aircraft.id == aircraft_id).first()
        
        if not aircraft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aircraft {aircraft_id} not found",
            )
        
        if aircraft.state != AircraftState.EMERGENCY:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Aircraft {aircraft_id} is not in EMERGENCY state",
            )
        
        # Transition to PARKED (safe ground state)
        aircraft = AircraftService.transition_aircraft_state(
            db=db,
            aircraft_id=aircraft_id,
            target_state=AircraftState.PARKED,
            operator_id=operator_id,
        )
        
        # Log clearance event
        event = EventLogger.create_event(
            event_type=EventType.EMERGENCY_CLEARED,
            severity=EventSeverity.INFO,
            entity_type="aircraft",
            entity_id=aircraft_id,
            details={
                "resolution": resolution,
                "tail_number": aircraft.tail_number,
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
    def lock_pad_emergency(
        db: Session,
        pad_id: str,
        reason: str,
        operator_id: Optional[str] = None,
    ) -> Vertipad:
        """
        Emergency lock vertipad (blocks all operations).
        
        Args:
            db: Database session
            pad_id: Vertipad to lock
            reason: Reason for emergency lock
            operator_id: Operator initiating lock
            
        Returns:
            Updated vertipad entity
        """
        pad = PadService.transition_pad_state(
            db=db,
            pad_id=pad_id,
            target_state=VertipadState.EMERGENCY_LOCKED,
            operator_id=operator_id,
        )
        
        # Log event
        event = EventLogger.create_event(
            event_type=EventType.EMERGENCY_DECLARED,
            severity=EventSeverity.CRITICAL,
            entity_type="vertipad",
            entity_id=pad_id,
            details={
                "reason": reason,
                "action": "emergency_locked",
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
    def unlock_pad_emergency(
        db: Session,
        pad_id: str,
        operator_id: Optional[str] = None,
    ) -> Vertipad:
        """
        Clear emergency lock on vertipad.
        
        Args:
            db: Database session
            pad_id: Vertipad to unlock
            operator_id: Operator clearing lock
            
        Returns:
            Updated vertipad entity
        """
        pad = PadService.transition_pad_state(
            db=db,
            pad_id=pad_id,
            target_state=VertipadState.AVAILABLE,
            operator_id=operator_id,
        )
        
        # Log event
        event = EventLogger.create_event(
            event_type=EventType.EMERGENCY_CLEARED,
            severity=EventSeverity.INFO,
            entity_type="vertipad",
            entity_id=pad_id,
            details={"action": "emergency_unlocked"},
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
    def get_all_emergencies(db: Session) -> dict:
        """
        Get summary of all active emergencies.
        
        Returns:
            Dictionary with emergency aircraft and locked pads
        """
        emergency_aircraft = db.query(Aircraft).filter(
            Aircraft.is_emergency
        ).all()
        
        locked_pads = db.query(Vertipad).filter(
            Vertipad.state == VertipadState.EMERGENCY_LOCKED
        ).all()
        
        aborted_workflows = db.query(Workflow).filter(
            Workflow.state == WorkflowState.EMERGENCY_ABORTED,
            Workflow.completed_at >= datetime.utcnow().replace(hour=0, minute=0, second=0),
        ).all()
        
        return {
            "emergency_aircraft": emergency_aircraft,
            "locked_pads": locked_pads,
            "aborted_workflows_today": aborted_workflows,
        }

