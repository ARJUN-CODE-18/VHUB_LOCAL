"""
Adapter module for pad (vertipad) models used by tests.
Exports PadState enum and re-exports DB model.
"""
from enum import Enum

class PadState(str, Enum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    OCCUPIED = "OCCUPIED"
    CHARGING = "CHARGING"
    MAINTENANCE = "MAINTENANCE"
    OFFLINE = "OFFLINE"

# Re-export DB model (Vertipad)
from app.db.models.vertipad import Vertipad as Vertipad  # noqa: E402

__all__ = ["PadState", "Vertipad"]
