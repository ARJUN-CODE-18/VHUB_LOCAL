from datetime import datetime
from typing import List
from sqlalchemy.orm import Session
from app.db.models.slot import Slot


def has_conflict(existing_slots: List[Slot], start: datetime, end: datetime) -> bool:
    """
    Check if requested slot overlaps with existing slots.
    """

    for slot in existing_slots:
        if slot.start_time < end and slot.end_time > start:
            return True

    return False


def find_available_pad(db: Session, start, end):
    pad1_slots = db.query(Slot).filter(Slot.vertipad_id == "PAD-1").all()
    if not has_conflict(pad1_slots, start, end):
        return "PAD-1"

    pad2_slots = db.query(Slot).filter(Slot.vertipad_id == "PAD-2").all()
    if not has_conflict(pad2_slots, start, end):
        return "PAD-2"

    raise Exception("No vertipad available for requested time window")