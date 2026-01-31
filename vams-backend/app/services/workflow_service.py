"""
Workflow service layer for orchestrating operational sequences.
Coordinates aircraft, pad, and slot FSMs for complete operations.
"""
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.db.models.workflow import Workflow
from app.db.models.aircraft import Aircraft
from app.db.models.vertipad import Vertipad
from app.db.models.slot import Slot
from app.db.models.audit import AuditLog
from app.core.fsm.workflow_fsm import WorkflowFSM, WorkflowType, WorkflowState, WorkflowFSMViolation
from app.core.events import EventLogger, EventType, EventSeverity
from fastapi import HTTPException, status


class WorkflowService:
    """Business logic for workflow orchestration"""
    
    @staticmethod
    def initiate_workflow(
        db: Session,
        workflow_type: WorkflowType,
        aircraft_id: str,
        vertipad_id: str,
        slot_id: Optional[str] = None,
        operator_id: Optional[str] = None,
    ) -> Workflow:
        """
        Initiate a new operational workflow.
        
        Args:
            db: Database session
            workflow_type: Type of workflow (ARRIVAL/DEPARTURE)
            aircraft
            _id: Aircraft identifier
        vertipad_id: Vertipad identifier
        slot_id: Associated slot (optional)
        operator_id: Operator initiating workflow
        Returns:
            Created workflow entity
        """
        # Validate aircraft
        aircraft = db.query(Aircraft).filter(Aircraft.id == aircraft_id).first()
        if not aircraft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aircraft {aircraft_id} not found",
            )
        
        # Validate vertipad
        pad = db.query(Vertipad).filter(Vertipad.id == vertipad_id).first()
        if not pad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vertipad {vertipad_id} not found",
            )
        
        # Validate slot if provided
        if slot_id:
            slot = db.query(Slot).filter(Slot.id == slot_id).first()
            if not slot:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Slot {slot_id} not found",
                )
        
        # Create workflow
        workflow = Workflow(
            workflow_type=workflow_type,
            state=WorkflowState.INITIATED,
            aircraft_id=aircraft_id,
            vertipad_id=vertipad_id,
            slot_id=slot_id,
            initiated_at=datetime.utcnow(),
            is_emergency=False,
        )
        
        db.add(workflow)
        db.flush()
        
        # Log event
        event = EventLogger.create_event(
            event_type=EventType.WORKFLOW_INITIATED,
            severity=EventSeverity.INFO,
            entity_type="workflow",
            entity_id=workflow.id,
            details={
                "workflow_type": workflow_type,
                "aircraft_id": aircraft_id,
                "vertipad_id": vertipad_id,
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
        db.refresh(workflow)
        
        return workflow

    @staticmethod
    def transition_workflow_state(
        db: Session,
        workflow_id: str,
        target_state: WorkflowState,
        operator_id: Optional[str] = None,
    ) -> Workflow:
        """
        Transition workflow to new state with FSM validation.
        
        Args:
            db: Database session
            workflow_id: Workflow identifier
            target_state: Desired target state
            operator_id: Operator initiating transition
            
        Returns:
            Updated workflow entity
        """
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow {workflow_id} not found",
            )
        
        current_state = workflow.state
        
        # Validate FSM transition
        try:
            WorkflowFSM.validate_transition(workflow.workflow_type, current_state, target_state)
        except WorkflowFSMViolation as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        
        # Update state
        workflow.state = target_state
        
        # Update milestone timestamps
        now = datetime.utcnow()
        if target_state == WorkflowState.APPROACH_CLEARED:
            workflow.approach_cleared_at = now
        elif target_state == WorkflowState.LANDING_CLEARED:
            workflow.landing_cleared_at = now
        elif target_state == WorkflowState.LANDED:
            workflow.landed_at = now
        elif target_state == WorkflowState.DEPARTURE_CLEARED:
            workflow.departure_cleared_at = now
        elif target_state == WorkflowState.COMPLETED:
            workflow.completed_at = now
        elif target_state == WorkflowState.EMERGENCY_ABORTED:
            workflow.is_emergency = True
            workflow.completed_at = now
        
        db.flush()
        
        # Log event
        event = EventLogger.create_event(
            event_type=EventType.WORKFLOW_STATE_CHANGED,
            severity=EventSeverity.WARNING if target_state == WorkflowState.EMERGENCY_ABORTED else EventSeverity.INFO,
            entity_type="workflow",
            entity_id=workflow.id,
            details={
                "workflow_type": workflow.workflow_type,
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
        db.refresh(workflow)
        
        return workflow

    @staticmethod
    def complete_workflow(
        db: Session,
        workflow_id: str,
        completion_notes: Optional[str] = None,
        operator_id: Optional[str] = None,
    ) -> Workflow:
        """Mark workflow as completed"""
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow {workflow_id} not found",
            )
        
        # Transition to completed
        try:
            WorkflowFSM.validate_transition(
                workflow.workflow_type,
                workflow.state,
                WorkflowState.COMPLETED,
            )
        except WorkflowFSMViolation as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        
        workflow.state = WorkflowState.COMPLETED
        workflow.completed_at = datetime.utcnow()
        workflow.completion_notes = completion_notes
        
        # Log event
        event = EventLogger.create_event(
            event_type=EventType.WORKFLOW_COMPLETED,
            severity=EventSeverity.INFO,
            entity_type="workflow",
            entity_id=workflow.id,
            details={
                "workflow_type": workflow.workflow_type,
                "completion_notes": completion_notes,
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
        db.refresh(workflow)
        
        return workflow

    @staticmethod
    def get_workflow(db: Session, workflow_id: str) -> Workflow:
        """Get workflow by ID"""
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workflow {workflow_id} not found",
            )
        
        return workflow

    @staticmethod
    def get_active_workflow(db: Session, aircraft_id: str) -> Optional[Workflow]:
        """Get active workflow for aircraft"""
        return (
            db.query(Workflow)
            .filter(
                Workflow.aircraft_id == aircraft_id,
                Workflow.state.notin_([
                    WorkflowState.COMPLETED,
                    WorkflowState.CANCELLED,
                    WorkflowState.EMERGENCY_ABORTED,
                ]),
            )
            .first()
        )