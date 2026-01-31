"""
Weather database model.
Tracks meteorological conditions affecting operations.
"""
from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin
import uuid


class WeatherReport(Base, TimestampMixin):
    """Weather observation for vertipad location"""
    __tablename__ = "weather_reports"
    
    # Primary identifier
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign key → Vertipad
    vertipad_id = Column(String(20), ForeignKey("vertipad.id"), nullable=False)
    
    # Observation time
    observation_time = Column(DateTime, nullable=False, index=True)
    
    # Wind data
    wind_speed_mps = Column(Float, nullable=False)
    wind_direction_deg = Column(Float, nullable=False)
    wind_gust_mps = Column(Float, nullable=True)
    crosswind_component_mps = Column(Float, nullable=True)
    
    # Visibility
    visibility_m = Column(Float, nullable=False)
    
    # Precipitation
    precipitation_rate_mmh = Column(Float, default=0.0, nullable=False)
    precipitation_type = Column(String(20), nullable=True)
    
    # Temperature and pressure
    temperature_c = Column(Float, nullable=False)
    pressure_hpa = Column(Float, nullable=False)
    humidity_percent = Column(Float, nullable=False)
    
    # Cloud conditions
    cloud_ceiling_m = Column(Float, nullable=True)
    cloud_coverage_percent = Column(Float, nullable=True)
    
    # Operational assessment
    is_vfr = Column(Boolean, nullable=False)
    is_operational = Column(Boolean, nullable=False)
    constraint_reasons = Column(Text, nullable=True)
    
    # Data source
    source = Column(String(50), nullable=False)
    
    # Relationship → Vertipad
    # Removed back_populates to Vertipad.weather_reports per request
    
    def __repr__(self):
        return f"<WeatherReport vertipad={self.vertipad_id} time={self.observation_time}>"
    