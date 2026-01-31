"""
Pydantic schemas for slot API requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.db.models.slot import SlotType, SlotStatus


class SlotCreate(BaseModel):
    """Schema for slot creation"""
    vertipad_id: str
    aircraft_id: str
    slot_type: SlotType
    start_time: datetime
    duration_minutes: int = Field(..., gt=0, le=240)
    priority: int = Field(default=0, ge=0, le=10)


class SlotResponse(BaseModel):
    """Schema for slot response"""
    id: str
    slot_type: SlotType
    status: SlotStatus
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    vertipad_id: str
    aircraft_id: str
    priority: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


class SlotListQuery(BaseModel):
    """Schema for slot list query parameters"""
    vertipad_id: Optional[str] = None
    aircraft_id: Optional[str] = None
    status: Optional[SlotStatus] = None
    start_after: Optional[datetime] = None
    start_before: Optional[datetime] = None