"""
Slot database model.
Tracks time-based reservations for vertipad usage.
"""
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin
from enum import Enum
from typing import Any


class SlotType(str, Enum):
    """Type of slot reservation"""
    ARRIVAL = "ARRIVAL"
    DEPARTURE = "DEPARTURE"


class SlotStatus(str, Enum):
    """Slot reservation status"""
    REQUESTED = "REQUESTED"
    CONFIRMED = "CONFIRMED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Slot(Base, TimestampMixin):
    """Time slot reservation for aircraft operations"""
    __tablename__ = "slots"
    
    # Primary identifier
    id = Column(String(36), primary_key=True)
    
    # Type and status
    slot_type: Any = Column(SQLEnum(SlotType), nullable=False, index=True)
    status: Any = Column(
        SQLEnum(SlotStatus),
        nullable=False,
        default=SlotStatus.REQUESTED,
        index=True,
    )
    
    # Time window
    start_time: Any = Column(DateTime, nullable=False, index=True)
    end_time: Any = Column(DateTime, nullable=False, index=True)
    duration_minutes: Any = Column(Integer, nullable=False)
    
    # Foreign keys
    vertipad_id: Any = Column(String(20), ForeignKey("vertipad.id"), nullable=False)
    aircraft_id: Any = Column(String(36), ForeignKey("aircraft.id"), nullable=False)
    
    # Priority (for conflict resolution)
    priority: Any = Column(Integer, default=0, nullable=False)
    
    # Relationships
    vertipad = relationship("Vertipad", back_populates="slots")
    aircraft = relationship("Aircraft", back_populates="slots")
    
    def __repr__(self):
        return f"<Slot {self.id} {self.slot_type} {self.start_time}>"