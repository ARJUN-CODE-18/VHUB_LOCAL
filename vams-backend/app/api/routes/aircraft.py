"""
Aircraft API routes.
Thin layer over aircraft service - validation and service calls only.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api.deps import get_db_session, get_current_operator
from app.schemas.aircraft import (
    AircraftCreate,
    AircraftResponse,
    AircraftStateTransition,
    AircraftBatteryUpdate,
    AircraftPositionUpdate,
)
from app.services.aircraft_service import AircraftService
from app.core.fsm.aircraft_fsm import AircraftState

router = APIRouter(prefix="/aircraft", tags=["aircraft"])


@router.post("/", response_model=AircraftResponse, status_code=201)
def register_aircraft(
    data: AircraftCreate,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Register a new aircraft in the system"""
    aircraft = AircraftService.register_aircraft(
        db=db,
        tail_number=data.tail_number,
        aircraft_type=data.aircraft_type,
        operator=data.operator,
        weight_kg=data.weight_kg,
        max_range_km=data.max_range_km,
        battery_level=data.battery_level,
    )
    return aircraft


@router.get("/{aircraft_id}", response_model=AircraftResponse)
def get_aircraft(
    aircraft_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Get aircraft by ID"""
    aircraft = AircraftService.get_aircraft(db, aircraft_id)
    return aircraft


@router.get("/tail/{tail_number}", response_model=AircraftResponse)
def get_aircraft_by_tail(
    tail_number: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Get aircraft by tail number"""
    aircraft = AircraftService.get_aircraft_by_tail(db, tail_number)
    return aircraft


@router.get("/", response_model=List[AircraftResponse])
def list_aircraft(
    state: Optional[AircraftState] = Query(None),
    is_emergency: Optional[bool] = Query(None),
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """List all aircraft with optional filters"""
    aircraft = AircraftService.list_aircraft(db, state, is_emergency)
    return aircraft


@router.post("/{aircraft_id}/transition", response_model=AircraftResponse)
def transition_aircraft_state(
    aircraft_id: str,
    data: AircraftStateTransition,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Transition aircraft to new state"""
    aircraft = AircraftService.transition_aircraft_state(
        db=db,
        aircraft_id=aircraft_id,
        target_state=data.target_state,
        operator_id=operator,
    )
    return aircraft


@router.patch("/{aircraft_id}/battery", response_model=AircraftResponse)
def update_battery_level(
    aircraft_id: str,
    data: AircraftBatteryUpdate,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Update aircraft battery level"""
    aircraft = AircraftService.update_battery_level(
        db=db,
        aircraft_id=aircraft_id,
        battery_level=data.battery_level,
    )
    return aircraft


@router.patch("/{aircraft_id}/position", response_model=AircraftResponse)
def update_position(
    aircraft_id: str,
    data: AircraftPositionUpdate,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Update aircraft position"""
    aircraft = AircraftService.update_position(
        db=db,
        aircraft_id=aircraft_id,
        latitude=data.latitude,
        longitude=data.longitude,
        altitude_m=data.altitude_m,
    )
    return aircraft
