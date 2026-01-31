"""
Ground Operations API routes.
Handles workflow orchestration for arrivals and departures.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from app.api.deps import get_db_session, get_current_operator
from app.schemas.workflow import (
    WorkflowInitiate,
    WorkflowResponse,
    WorkflowStateTransition,
    WorkflowComplete,
)
from app.services.workflow_service import WorkflowService


router = APIRouter(prefix="/groundops", tags=["groundops"])


@router.post("/workflows", response_model=WorkflowResponse, status_code=201)
def initiate_workflow(
    data: WorkflowInitiate,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Initiate a new operational workflow"""
    workflow = WorkflowService.initiate_workflow(
        db=db,
        workflow_type=data.workflow_type,
        aircraft_id=data.aircraft_id,
        vertipad_id=data.vertipad_id,
        slot_id=data.slot_id,
        operator_id=operator,
    )
    return workflow


@router.get("/workflows/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(
    workflow_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Get workflow by ID"""
    workflow = WorkflowService.get_workflow(db, workflow_id)
    return workflow


@router.get("/workflows/active/{aircraft_id}", response_model=Optional[WorkflowResponse])
def get_active_workflow(
    aircraft_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Get active workflow for aircraft"""
    workflow = WorkflowService.get_active_workflow(db, aircraft_id)
    return workflow


@router.post("/workflows/{workflow_id}/transition", response_model=WorkflowResponse)
def transition_workflow_state(
    workflow_id: str,
    data: WorkflowStateTransition,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Transition workflow to new state"""
    workflow = WorkflowService.transition_workflow_state(
        db=db,
        workflow_id=workflow_id,
        target_state=data.target_state,
        operator_id=operator,
    )
    return workflow


@router.post("/workflows/{workflow_id}/complete", response_model=WorkflowResponse)
def complete_workflow(
    workflow_id: str,
    data: WorkflowComplete,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Mark workflow as completed"""
    workflow = WorkflowService.complete_workflow(
        db=db,
        workflow_id=workflow_id,
        completion_notes=data.completion_notes,
        operator_id=operator,
    )
    return workflow