"""
Vertipad database model.
Tracks pad state, availability, and physical characteristics.
"""

from sqlalchemy import Column, String, Float, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from typing import Any

from app.db.base import Base, TimestampMixin
from app.core.fsm.pad_fsm import VertipadState


class Vertipad(Base, TimestampMixin):
    """Vertipad entity with FSM state tracking"""

    __tablename__ = "vertipad"

    # ─────────────────────────────
    # Primary identifier
    # ─────────────────────────────
    id: Any = Column(String(20), primary_key=True)  # e.g., "PAD-01"

    # ─────────────────────────────
    # FSM state
    # ─────────────────────────────
    state: Any = Column(
        SQLEnum(VertipadState),
        nullable=False,
        default=VertipadState.AVAILABLE,
        index=True,
    )

    # ─────────────────────────────
    # Physical characteristics
    # ─────────────────────────────
    name: Any = Column(String(100), nullable=False)

    latitude: Any = Column(Float, nullable=False)
    longitude: Any = Column(Float, nullable=False)
    elevation_m: Any = Column(Float, nullable=False, default=0.0)

    diameter_m: Any = Column(Float, nullable=False, default=20.0)
    max_weight_kg: Any = Column(Float, nullable=False, default=2000.0)

    # ─────────────────────────────
    # Capabilities
    # ─────────────────────────────
    has_charging: Any = Column(Boolean, nullable=False, default=True)
    charging_power_kw: Any = Column(Float, nullable=True)

    has_lighting: Any = Column(Boolean, nullable=False, default=True)
    has_weather_station: Any = Column(Boolean, nullable=False, default=True)

    # ─────────────────────────────
    # Operational status
    # ─────────────────────────────
    is_operational: Any = Column(Boolean, nullable=False, default=True)

    # Backend-driven occupancy status for UI and integrations.
    status: Any = Column(String(20), nullable=False, default="AVAILABLE", index=True)

    # Current occupancy
    current_aircraft_id: Any = Column(String(36), nullable=True, index=True)

    # ─────────────────────────────
    # Relationships (ONLY EXISTING MODELS)
    # ─────────────────────────────
    slots = relationship(
        "Slot",
        back_populates="vertipad",
        cascade="all, delete-orphan",
    )

    # Energy sessions (charging) — model exists so enable relationship
    energy_sessions = relationship(
        "EnergySession",
        back_populates="vertipad",
        cascade="all, delete-orphan",
    )

    # ─────────────────────────────
    # 🚫 FUTURE SYSTEMS (INTENTIONALLY DISABLED)
    # ─────────────────────────────
    # These will be enabled ONLY after their models exist.
    #
    # energy_sessions = relationship("EnergySession", back_populates="vertipad")

    def __repr__(self) -> str:
        return f"<Vertipad id={self.id} state={self.state}>"
