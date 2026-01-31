"""
Seed test data for VAMS backend.
Populates Aircraft, Vertipads, and Slots with sample data.
"""

from datetime import datetime, timedelta
import uuid

from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine
from app.db.base import Base
from app.db.models.aircraft import Aircraft, AircraftState
from app.db.models.pad import Vertipad
from app.db.models.slot import Slot, SlotType, SlotStatus

# Create tables if they don't exist
engine = create_engine("sqlite:///./test.db")  # Update with your database URL
Base.metadata.create_all(bind=engine)

def seed_data(session: Session):
    # --- Aircraft ---
    aircraft_list = [
        Aircraft(
            tail_number="VT-A101",
            aircraft_type="eVTOL Alpha",
            operator="test_operator",
            state=AircraftState.REGISTERED,
            weight_kg=1200,
            max_range_km=150
        ),
        Aircraft(
            tail_number="VT-A102",
            aircraft_type="eVTOL Beta",
            operator="test_operator",
            state=AircraftState.REGISTERED,
            weight_kg=1300,
            max_range_km=200
        ),
        Aircraft(
            tail_number="VT-A103",
            aircraft_type="eVTOL Gamma",
            operator="test_operator",
            state=AircraftState.REGISTERED,
            weight_kg=1100,
            max_range_km=180
        ),
    ]
    session.add_all(aircraft_list)
    session.commit()

    # --- Vertipads ---
    pad_list = [
        Vertipad(id="PAD-01", name="Pad 1", latitude=12.9716, longitude=77.5946),
        Vertipad(id="PAD-02", name="Pad 2", latitude=12.9352, longitude=77.6245),
    ]
    session.add_all(pad_list)
    session.commit()

    # --- Slots ---
    now = datetime.utcnow()
    slot_list = [
        Slot(
            id=str(uuid.uuid4()),
            vertipad_id="PAD-01",
            aircraft_id=aircraft_list[0].id,
            slot_type=SlotType.ARRIVAL,
            status=SlotStatus.CONFIRMED,
            start_time=now + timedelta(minutes=15),
            end_time=now + timedelta(minutes=30),
            duration_minutes=15,
            priority=1
        ),
        Slot(
            id=str(uuid.uuid4()),
            vertipad_id="PAD-01",
            aircraft_id=aircraft_list[1].id,
            slot_type=SlotType.DEPARTURE,
            status=SlotStatus.CONFIRMED,
            start_time=now + timedelta(minutes=35),
            end_time=now + timedelta(minutes=50),
            duration_minutes=15,
            priority=2
        ),
        Slot(
            id=str(uuid.uuid4()),
            vertipad_id="PAD-02",
            aircraft_id=aircraft_list[2].id,
            slot_type=SlotType.ARRIVAL,
            status=SlotStatus.CONFIRMED,
            start_time=now + timedelta(minutes=20),
            end_time=now + timedelta(minutes=40),
            duration_minutes=20,
            priority=1
        ),
        Slot(
            id=str(uuid.uuid4()),
            vertipad_id="PAD-02",
            aircraft_id=aircraft_list[0].id,
            slot_type=SlotType.DEPARTURE,
            status=SlotStatus.REQUESTED,
            start_time=now + timedelta(minutes=50),
            end_time=now + timedelta(minutes=65),
            duration_minutes=15,
            priority=0
        ),
        Slot(
            id=str(uuid.uuid4()),
            vertipad_id="PAD-01",
            aircraft_id=aircraft_list[1].id,
            slot_type=SlotType.ARRIVAL,
            status=SlotStatus.REQUESTED,
            start_time=now + timedelta(minutes=60),
            end_time=now + timedelta(minutes=75),
            duration_minutes=15,
            priority=1
        ),
    ]
    session.add_all(slot_list)
    session.commit()
    print("✅ Seed data inserted successfully.")


if __name__ == "__main__":
    from sqlalchemy.orm import sessionmaker

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    try:
        seed_data(session)
    finally:
        session.close()
