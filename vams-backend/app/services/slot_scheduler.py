from datetime import datetime
from typing import List
from sqlalchemy.orm import Session
from app.db.models.slot import Slot
from app.db.models.vertipad import Vertipad
from app.core.pad_catalog import STATIC_PAD_IDS


def has_conflict(existing_slots: List[Slot], start: datetime, end: datetime) -> bool:
    """
    Check if requested slot overlaps with existing slots.
    """

    for slot in existing_slots:
        if slot.start_time < end and slot.end_time > start:
            return True

    return False


def find_available_pad(db: Session, start, end):
    pads = (
        db.query(Vertipad)
        .filter(Vertipad.id.in_(STATIC_PAD_IDS), Vertipad.is_operational.is_(True))
        .order_by(Vertipad.id.asc())
        .all()
    )

    for pad in pads:
        if pad.current_aircraft_id is not None:
            continue

        pad_slots = db.query(Slot).filter(Slot.vertipad_id == pad.id).all()
        if not has_conflict(pad_slots, start, end):
            return pad.id

    raise Exception("No vertipad available for requested time window")