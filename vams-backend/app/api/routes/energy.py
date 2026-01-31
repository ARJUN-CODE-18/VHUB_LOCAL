"""
Energy/Charging API routes.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from app.api.deps import get_db_session, get_current_operator
from app.schemas.energy import (
    EnergySessionStart,
    EnergySessionStop,
    EnergySessionResponse,
)
from app.services.energy_service import EnergyService


router = APIRouter(prefix="/energy", tags=["energy"])


@router.post("/sessions/start", response_model=EnergySessionResponse, status_code=201)
def start_charging_session(
    data: EnergySessionStart,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Start a new charging session"""
    session = EnergyService.start_charging_session(
        db=db,
        vertipad_id=data.vertipad_id,
        aircraft_id=data.aircraft_id,
        initial_battery_percent=data.initial_battery_percent,
    )
    return session


@router.post("/sessions/{session_id}/stop", response_model=EnergySessionResponse)
def stop_charging_session(
    session_id: str,
    data: EnergySessionStop,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Stop an active charging session"""
    session = EnergyService.stop_charging_session(
        db=db,
        session_id=session_id,
        final_battery_percent=data.final_battery_percent,
        termination_reason=data.termination_reason,
    )
    return session


@router.get("/sessions/active/{aircraft_id}", response_model=Optional[EnergySessionResponse])
def get_active_session(
    aircraft_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Get active charging session for aircraft"""
    session = EnergyService.get_active_session(db, aircraft_id)
    return session


@router.get("/battery-check/{aircraft_id}")
def check_battery_for_departure(
    aircraft_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Check if aircraft battery is sufficient for departure"""
    is_sufficient, battery_level = EnergyService.check_battery_sufficient_for_departure(
        db=db,
        aircraft_id=aircraft_id,
    )
    return {
        "aircraft_id": aircraft_id,
        "is_sufficient": is_sufficient,
        "battery_level": battery_level,
        "minimum_required": 30.0,
    }