"""
Pydantic schemas for workflow API requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.core.fsm.workflow_fsm import WorkflowType, WorkflowState


class WorkflowInitiate(BaseModel):
    """Schema for workflow initiation"""
    workflow_type: WorkflowType
    aircraft_id: str
    vertipad_id: str
    slot_id: Optional[str] = None


class WorkflowStateTransition(BaseModel):
    """Schema for workflow state transition"""
    target_state: WorkflowState


class WorkflowComplete(BaseModel):
    """Schema for workflow completion"""
    completion_notes: Optional[str] = None


class WorkflowResponse(BaseModel):
    """Schema for workflow response"""
    id: str
    workflow_type: WorkflowType
    state: WorkflowState
    aircraft_id: str
    vertipad_id: str
    slot_id: Optional[str]
    initiated_at: datetime
    completed_at: Optional[datetime]
    approach_cleared_at: Optional[datetime]
    landing_cleared_at: Optional[datetime]
    landed_at: Optional[datetime]
    departure_cleared_at: Optional[datetime]
    is_emergency: bool
    completion_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EmergencyDeclare(BaseModel):
    """Schema for emergency declaration"""
    aircraft_id: str
    emergency_type: str = Field(..., min_length=1, max_length=50)
    description: str = Field(..., min_length=1, max_length=500)


class EmergencyClear(BaseModel):
    """Schema for emergency clearance"""
    aircraft_id: str
    resolution: str = Field(..., min_length=1, max_length=500)


class PadEmergencyLock(BaseModel):
    """Schema for pad emergency lock"""
    pad_id: str
    reason: str = Field(..., min_length=1, max_length=500)


class PadEmergencyUnlock(BaseModel):
    """Schema for pad emergency unlock"""
    pad_id: str