"""
Aircraft database model.
Tracks aircraft registration, state, and operational status.
"""

import uuid
from typing import Any

from sqlalchemy import (
    Column,
    String,
    Float,
    DateTime,
    Boolean,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship

from app.db.base import Base, TimestampMixin
from app.core.fsm.aircraft_fsm import AircraftState


class Aircraft(Base, TimestampMixin):
    """Aircraft entity with FSM state tracking"""

    __tablename__ = "aircraft"

    # Primary identifier
    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    # Aircraft identification
    tail_number = Column(
        String(20),
        unique=True,
        nullable=False,
        index=True,
    )

    aircraft_type = Column(
        String(50),
        nullable=False,
    )

    operator = Column(
        String(100),
        nullable=False,
    )

    # FSM state
    state: Any = Column(
        SQLEnum(AircraftState, name="aircraft_state_enum"),
        nullable=False,
        default=AircraftState.REGISTERED,
        index=True,
    )

    # Operational data
    battery_level: Any = Column(
        Float,
        nullable=True,
    )  # Percentage 0–100

    fuel_level: Any = Column(
        Float,
        nullable=True,
    )  # For hybrid aircraft

    weight_kg: Any = Column(
        Float,
        nullable=False,
    )

    max_range_km: Any = Column(
        Float,
        nullable=False,
    )

    # Status flags
    is_emergency: Any = Column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
    )

    # Last known position
    last_latitude: Any = Column(Float, nullable=True)
    last_longitude: Any = Column(Float, nullable=True)
    last_altitude_m: Any = Column(Float, nullable=True)

    last_position_update: Any = Column(
        DateTime,
        nullable=True,
    )

    # Relationships
    slots = relationship(
        "Slot",
        back_populates="aircraft",
        cascade="all, delete-orphan",
    )

    # ---------------------------------------------------------------------
    # Representation
    # ---------------------------------------------------------------------
    def __repr__(self) -> str:
        return (
            f"<Aircraft id={self.id} "
            f"tail={self.tail_number} "
            f"state={self.state}>"
        )
