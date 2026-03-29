"""Seed deterministic demo data for local development.

This script is safe to run multiple times and keeps local SQLite data
aligned with what the frontend pages expect to render.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import uuid

from app.core.fsm.aircraft_fsm import AircraftState
from app.core.fsm.vertipad_fsm import VertipadState
from app.core.fsm.workflow_fsm import WorkflowState, WorkflowType
from app.core.pad_catalog import STATIC_PAD_DEFINITIONS, STATIC_PAD_IDS
from app.db.models.aircraft import Aircraft
from app.db.models.energy import EnergySession
from app.db.models.slot import Slot, SlotStatus, SlotType
from app.db.models.user import User
from app.db.models.vertipad import Vertipad
from app.db.models.weather import WeatherReport
from app.db.models.workflow import Workflow
from app.db.session import SessionLocal
from app.core.security import hash_password


def _ensure_user() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.userid == "VERTIHUB").first()
        if not user:
            db.add(User(userid="VERTIHUB", password_hash=hash_password("eVTOL")))
            db.commit()
    finally:
        db.close()


def _ensure_pads() -> list[Vertipad]:
    db = SessionLocal()
    try:
        pads: list[Vertipad] = []
        for pad_id in STATIC_PAD_IDS:
            definition = STATIC_PAD_DEFINITIONS[pad_id]
            pad = db.query(Vertipad).filter(Vertipad.id == pad_id).first()
            if not pad:
                pad = Vertipad(
                    id=pad_id,
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
                    state=VertipadState.AVAILABLE,
                    status=VertipadState.AVAILABLE.value,
                    current_aircraft_id=None,
                )
                db.add(pad)
            else:
                pad.name = definition["name"]
                pad.latitude = definition["latitude"]
                pad.longitude = definition["longitude"]
                pad.elevation_m = definition["elevation_m"]
                pad.diameter_m = definition["diameter_m"]
                pad.max_weight_kg = definition["max_weight_kg"]
                pad.has_charging = definition["charging_power_kw"] is not None
                pad.charging_power_kw = definition["charging_power_kw"]
                if not pad.status:
                    pad.status = (pad.state.value if hasattr(pad.state, "value") else str(pad.state))

            pads.append(pad)

        db.commit()
        for pad in pads:
            db.refresh(pad)
        return pads
    finally:
        db.close()


def _ensure_aircraft() -> list[Aircraft]:
    db = SessionLocal()
    try:
        seed_specs = [
            ("VT-A101", "eVTOL Alpha", 42.0, 1200.0, 150.0),
            ("VT-A102", "eVTOL Beta", 78.0, 1300.0, 200.0),
            ("VT-A103", "eVTOL Gamma", 55.0, 1100.0, 180.0),
        ]

        aircraft_rows: list[Aircraft] = []
        for idx, (tail, aircraft_type, battery, weight, max_range) in enumerate(seed_specs):
            row = db.query(Aircraft).filter(Aircraft.tail_number == tail).first()
            if not row:
                row = Aircraft(
                    tail_number=tail,
                    aircraft_type=aircraft_type,
                    operator="test_operator",
                    state=AircraftState.PARKED,
                    battery_level=battery,
                    weight_kg=weight,
                    max_range_km=max_range,
                )
                db.add(row)
            else:
                row.aircraft_type = aircraft_type
                row.operator = "test_operator"
                row.battery_level = battery
                row.weight_kg = weight
                row.max_range_km = max_range

            row.is_emergency = idx == 2
            aircraft_rows.append(row)

        db.commit()
        for row in aircraft_rows:
            db.refresh(row)
        return aircraft_rows
    finally:
        db.close()


def _assign_demo_states() -> None:
    db = SessionLocal()
    try:
        pads = db.query(Vertipad).filter(Vertipad.id.in_(STATIC_PAD_IDS)).order_by(Vertipad.id.asc()).all()
        aircraft = db.query(Aircraft).order_by(Aircraft.tail_number.asc()).all()
        if len(pads) < 2 or len(aircraft) < 3:
            return

        pad1, pad2 = pads[0], pads[1]
        ac1, ac2, ac3 = aircraft[0], aircraft[1], aircraft[2]

        pad1.state = VertipadState.OCCUPIED
        pad1.status = VertipadState.OCCUPIED.value
        pad1.current_aircraft_id = ac1.id

        pad2.state = VertipadState.CHARGING_ACTIVE
        pad2.status = VertipadState.CHARGING_ACTIVE.value
        pad2.current_aircraft_id = ac2.id

        ac1.state = AircraftState.PARKED
        ac1.pad_id = pad1.id

        ac2.state = AircraftState.CHARGING
        ac2.pad_id = pad2.id

        ac3.state = AircraftState.EMERGENCY
        ac3.pad_id = None
        ac3.is_emergency = True

        db.commit()
    finally:
        db.close()


def _ensure_slots() -> None:
    db = SessionLocal()
    try:
        aircraft = db.query(Aircraft).order_by(Aircraft.tail_number.asc()).all()
        if len(aircraft) < 3:
            return

        now = datetime.utcnow()
        wanted = [
            ("VP-001", aircraft[0].id, SlotType.ARRIVAL, SlotStatus.CONFIRMED, 15),
            ("VP-002", aircraft[1].id, SlotType.DEPARTURE, SlotStatus.REQUESTED, 35),
            ("VP-001", aircraft[2].id, SlotType.ARRIVAL, SlotStatus.REQUESTED, 55),
        ]

        for pad_id, aircraft_id, slot_type, slot_status, start_min in wanted:
            existing = (
                db.query(Slot)
                .filter(Slot.vertipad_id == pad_id, Slot.aircraft_id == aircraft_id, Slot.slot_type == slot_type)
                .order_by(Slot.start_time.desc())
                .first()
            )
            if existing:
                continue

            start_time = now + timedelta(minutes=start_min)
            end_time = start_time + timedelta(minutes=15)
            db.add(
                Slot(
                    id=str(uuid.uuid4()),
                    vertipad_id=pad_id,
                    aircraft_id=aircraft_id,
                    slot_type=slot_type,
                    status=slot_status,
                    start_time=start_time,
                    end_time=end_time,
                    duration_minutes=15,
                    priority=1,
                )
            )

        db.commit()
    finally:
        db.close()


def _ensure_weather() -> None:
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        for idx, pad_id in enumerate(STATIC_PAD_IDS):
            db.add(
                WeatherReport(
                    vertipad_id=pad_id,
                    observation_time=now - timedelta(minutes=idx * 5),
                    wind_speed_mps=5.0 + idx,
                    wind_direction_deg=140.0 + idx * 15,
                    wind_gust_mps=7.0 + idx,
                    crosswind_component_mps=2.0 + idx,
                    visibility_m=9000.0 - idx * 500,
                    precipitation_rate_mmh=0.0,
                    precipitation_type=None,
                    temperature_c=31.0 - idx,
                    pressure_hpa=1008.0,
                    humidity_percent=58.0,
                    cloud_ceiling_m=1600.0,
                    cloud_coverage_percent=35.0,
                    is_vfr=True,
                    is_operational=True,
                    constraint_reasons=None,
                    source="demo-seed",
                )
            )
        db.commit()
    finally:
        db.close()


def _ensure_workflow_and_energy() -> None:
    db = SessionLocal()
    try:
        aircraft = db.query(Aircraft).order_by(Aircraft.tail_number.asc()).all()
        if len(aircraft) < 2:
            return

        ac2 = aircraft[1]

        active_workflow = (
            db.query(Workflow)
            .filter(Workflow.aircraft_id == ac2.id, Workflow.completed_at.is_(None))
            .order_by(Workflow.initiated_at.desc())
            .first()
        )
        if not active_workflow:
            db.add(
                Workflow(
                    workflow_type=WorkflowType.ARRIVAL,
                    state=WorkflowState.CHARGING,
                    aircraft_id=ac2.id,
                    vertipad_id="VP-002",
                    slot_id=None,
                    initiated_at=datetime.utcnow() - timedelta(minutes=25),
                    completed_at=None,
                    is_emergency=False,
                    completion_notes=None,
                )
            )

        active_energy = (
            db.query(EnergySession)
            .filter(EnergySession.aircraft_id == ac2.id, EnergySession.is_active.is_(True))
            .first()
        )
        if not active_energy:
            db.add(
                EnergySession(
                    vertipad_id="VP-002",
                    aircraft_id=ac2.id,
                    start_time=datetime.utcnow() - timedelta(minutes=18),
                    end_time=None,
                    initial_battery_percent=65.0,
                    final_battery_percent=None,
                    energy_delivered_kwh=21.0,
                    average_power_kw=70.0,
                    peak_power_kw=95.0,
                    is_active=True,
                    completed_successfully=None,
                    termination_reason=None,
                )
            )

        db.commit()
    finally:
        db.close()


def seed_demo_data() -> None:
    _ensure_user()
    _ensure_pads()
    _ensure_aircraft()
    _assign_demo_states()
    _ensure_slots()
    _ensure_weather()
    _ensure_workflow_and_energy()


if __name__ == "__main__":
    seed_demo_data()
    print("Demo data ensured for pads, aircraft, slots, weather, workflow, emergency, and energy.")
