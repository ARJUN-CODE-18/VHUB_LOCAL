"""
Energy database model.
Tracks charging sessions and power consumption.
"""
from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin
import uuid
from typing import Any


class EnergySession(Base, TimestampMixin):
    """Charging session for aircraft"""
    __tablename__ = "energy_sessions"
    
    # Primary identifier
    id: Any = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign keys
    vertipad_id: Any = Column(String(20), ForeignKey("vertipad.id"), nullable=False)
    aircraft_id: Any = Column(String(36), ForeignKey("aircraft.id"), nullable=False)
    
    # Session timing
    start_time: Any = Column(DateTime, nullable=False, index=True)
    end_time: Any = Column(DateTime, nullable=True, index=True)
    
    # Energy metrics
    initial_battery_percent: Any = Column(Float, nullable=False)
    final_battery_percent: Any = Column(Float, nullable=True)
    energy_delivered_kwh: Any = Column(Float, default=0.0, nullable=False)
    average_power_kw: Any = Column(Float, nullable=True)
    peak_power_kw: Any = Column(Float, nullable=True)
    
    # Status
    is_active: Any = Column(Boolean, default=True, nullable=False, index=True)
    completed_successfully: Any = Column(Boolean, nullable=True)
    termination_reason: Any = Column(String(100), nullable=True)
    
    # Relationships
    vertipad = relationship("Vertipad", back_populates="energy_sessions")
    aircraft = relationship("Aircraft")
    
    def __repr__(self):
        return f"<EnergySession {self.id} {self.aircraft_id}>"