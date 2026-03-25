"""
Pydantic schemas for vertipad API requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.core.fsm.vertipad_fsm import VertipadState
from app.core.priority import PriorityLevel


class VertipadInitialize(BaseModel):
    """Schema for vertipad initialization"""
    pad_id: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=100)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    elevation_m: float
    diameter_m: float = Field(..., gt=0)
    max_weight_kg: float = Field(..., gt=0)
    charging_power_kw: Optional[float] = Field(None, gt=0)


class VertipadStateTransition(BaseModel):
    """Schema for pad state transition request"""
    target_state: VertipadState


class VertipadOccupy(BaseModel):
    """Schema for occupying pad"""
    aircraft_id: str
    priority: PriorityLevel = PriorityLevel.NORMAL


class PadQueueEntry(BaseModel):
    aircraft_id: str
    priority: PriorityLevel
    timestamp: float


class VertipadResponse(BaseModel):
    """Schema for vertipad response"""
    id: str
    state: VertipadState
    status: str
    name: str
    latitude: float
    longitude: float
    elevation_m: float
    diameter_m: float
    max_weight_kg: float
    has_charging: bool
    charging_power_kw: Optional[float]
    has_lighting: bool
    has_weather_station: bool
    is_operational: bool
    current_aircraft_id: Optional[str]
    queue: list[PadQueueEntry] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True