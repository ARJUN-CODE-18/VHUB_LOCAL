"""
Seed and enforce static vertipad definitions.
Creates VP-001 and VP-002 when missing and removes all other pads.
"""

from app.core.fsm.pad_fsm import VertipadState
from app.core.pad_catalog import STATIC_PAD_DEFINITIONS, STATIC_PAD_IDS
from app.db.models.slot import Slot
from app.db.models.vertipad import Vertipad
from app.db.session import SessionLocal


def enforce_static_pads() -> None:
    db = SessionLocal()
    try:
        # Remove slots attached to invalid pads first to satisfy FK constraints.
        db.query(Slot).filter(~Slot.vertipad_id.in_(STATIC_PAD_IDS)).delete(synchronize_session=False)
        db.query(Vertipad).filter(~Vertipad.id.in_(STATIC_PAD_IDS)).delete(synchronize_session=False)

        for pad_id, definition in STATIC_PAD_DEFINITIONS.items():
            existing = db.query(Vertipad).filter(Vertipad.id == pad_id).first()
            if existing:
                existing.name = definition["name"]
                existing.latitude = definition["latitude"]
                existing.longitude = definition["longitude"]
                existing.elevation_m = definition["elevation_m"]
                existing.diameter_m = definition["diameter_m"]
                existing.max_weight_kg = definition["max_weight_kg"]
                existing.has_charging = definition["charging_power_kw"] is not None
                existing.charging_power_kw = definition["charging_power_kw"]
                existing.is_operational = True
                if existing.state not in (VertipadState.AVAILABLE, VertipadState.RESERVED):
                    existing.state = VertipadState.AVAILABLE
                if existing.state == VertipadState.AVAILABLE:
                    existing.current_aircraft_id = None
                continue

            db.add(
                Vertipad(
                    id=pad_id,
                    state=VertipadState.AVAILABLE,
                    name=definition["name"],
                    latitude=definition["latitude"],
                    longitude=definition["longitude"],
                    elevation_m=definition["elevation_m"],
                    diameter_m=definition["diameter_m"],
                    max_weight_kg=definition["max_weight_kg"],
                    has_charging=definition["charging_power_kw"] is not None,
                    charging_power_kw=definition["charging_power_kw"],
                    has_lighting=True,
                    has_weather_station=True,
                    is_operational=True,
                    current_aircraft_id=None,
                )
            )

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    enforce_static_pads()
    print("Static pads enforced: VP-001, VP-002")
