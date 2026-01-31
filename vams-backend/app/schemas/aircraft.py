"""
Pydantic schemas for aircraft API requests and responses.
Provides validation and serialization for aircraft operations.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.core.fsm.aircraft_fsm import AircraftState


class AircraftCreate(BaseModel):
    """Schema for aircraft registration"""
    tail_number: str = Field(..., min_length=3, max_length=20)
    aircraft_type: str = Field(..., min_length=1, max_length=50)
    operator: str = Field(..., min_length=1, max_length=100)
    weight_kg: float = Field(..., gt=0)
    max_range_km: float = Field(..., gt=0)
    battery_level: Optional[float] = Field(None, ge=0, le=100)


class AircraftStateTransition(BaseModel):
    """Schema for aircraft state transition request"""
    target_state: AircraftState


class AircraftBatteryUpdate(BaseModel):
    """Schema for battery level update"""
    battery_level: float = Field(..., ge=0, le=100)


class AircraftPositionUpdate(BaseModel):
    """Schema for position update"""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    altitude_m: float = Field(..., ge=0)


class AircraftResponse(BaseModel):
    """Schema for aircraft response"""
    id: str
    tail_number: str
    aircraft_type: str
    operator: str
    state: AircraftState
    battery_level: Optional[float]
    fuel_level: Optional[float]
    weight_kg: float
    max_range_km: float
    is_emergency: bool
    last_latitude: Optional[float]
    last_longitude: Optional[float]
    last_altitude_m: Optional[float]
    last_position_update: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True