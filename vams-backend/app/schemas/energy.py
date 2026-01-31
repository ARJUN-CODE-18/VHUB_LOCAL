"""
Pydantic schemas for energy API requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class EnergySessionStart(BaseModel):
    """Schema for starting charging session"""
    vertipad_id: str
    aircraft_id: str
    initial_battery_percent: float = Field(..., ge=0, le=100)


class EnergySessionStop(BaseModel):
    """Schema for stopping charging session"""
    final_battery_percent: float = Field(..., ge=0, le=100)
    termination_reason: Optional[str] = None


class EnergySessionResponse(BaseModel):
    """Schema for energy session response"""
    id: str
    vertipad_id: str
    aircraft_id: str
    start_time: datetime
    end_time: Optional[datetime]
    initial_battery_percent: float
    final_battery_percent: Optional[float]
    energy_delivered_kwh: float
    average_power_kw: Optional[float]
    peak_power_kw: Optional[float]
    is_active: bool
    completed_successfully: Optional[bool]
    termination_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True