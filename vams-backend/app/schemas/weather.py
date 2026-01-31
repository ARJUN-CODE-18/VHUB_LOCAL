"""
Pydantic schemas for weather API requests and responses.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class WeatherReportCreate(BaseModel):
    """Schema for weather report creation"""
    vertipad_id: str
    observation_time: datetime
    wind_speed_mps: float = Field(..., ge=0)
    wind_direction_deg: float = Field(..., ge=0, lt=360)
    visibility_m: float = Field(..., ge=0)
    temperature_c: float
    pressure_hpa: float = Field(..., gt=0)
    humidity_percent: float = Field(..., ge=0, le=100)
    precipitation_rate_mmh: float = Field(default=0.0, ge=0)
    precipitation_type: Optional[str] = None
    wind_gust_mps: Optional[float] = Field(None, ge=0)
    cloud_ceiling_m: Optional[float] = Field(None, ge=0)
    cloud_coverage_percent: Optional[float] = Field(None, ge=0, le=100)
    source: str = Field(default="manual", max_length=50)


class WeatherReportResponse(BaseModel):
    """Schema for weather report response"""
    id: str
    vertipad_id: str
    observation_time: datetime
    wind_speed_mps: float
    wind_direction_deg: float
    wind_gust_mps: Optional[float]
    crosswind_component_mps: Optional[float]
    visibility_m: float
    precipitation_rate_mmh: float
    precipitation_type: Optional[str]
    temperature_c: float
    pressure_hpa: float
    humidity_percent: float
    cloud_ceiling_m: Optional[float]
    cloud_coverage_percent: Optional[float]
    is_vfr: bool
    is_operational: bool
    constraint_reasons: Optional[str]
    source: str
    created_at: datetime

    class Config:
        from_attributes = True