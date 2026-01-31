"""
Emergency API routes.
Critical safety operations with override capabilities.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db_session, get_current_operator
from app.schemas.workflow import (
    EmergencyDeclare,
    EmergencyClear,
    PadEmergencyLock,
    PadEmergencyUnlock,
)
from app.schemas.aircraft import AircraftResponse
from app.schemas.pad import VertipadResponse
from app.services.emergency_service import EmergencyService


router = APIRouter(prefix="/emergency", tags=["emergency"])


@router.post("/aircraft/declare", response_model=AircraftResponse)
def declare_aircraft_emergency(
    data: EmergencyDeclare,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Declare emergency for aircraft"""
    aircraft = EmergencyService.declare_aircraft_emergency(
        db=db,
        aircraft_id=data.aircraft_id,
        emergency_type=data.emergency_type,
        description=data.description,
        operator_id=operator,
    )
    return aircraft


@router.post("/aircraft/clear", response_model=AircraftResponse)
def clear_aircraft_emergency(
    data: EmergencyClear,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Clear aircraft emergency"""
    aircraft = EmergencyService.clear_aircraft_emergency(
        db=db,
        aircraft_id=data.aircraft_id,
        resolution=data.resolution,
        operator_id=operator,
    )
    return aircraft


@router.post("/pad/lock", response_model=VertipadResponse)
def lock_pad_emergency(
    data: PadEmergencyLock,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Emergency lock vertipad"""
    pad = EmergencyService.lock_pad_emergency(
        db=db,
        pad_id=data.pad_id,
        reason=data.reason,
        operator_id=operator,
    )
    return pad


@router.post("/pad/unlock", response_model=VertipadResponse)
def unlock_pad_emergency(
    data: PadEmergencyUnlock,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Clear emergency lock on vertipad"""
    pad = EmergencyService.unlock_pad_emergency(
        db=db,
        pad_id=data.pad_id,
        operator_id=operator,
    )
    return pad


@router.get("/status")
def get_emergency_status(
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Get summary of all active emergencies"""
    status = EmergencyService.get_all_emergencies(db)
    return {
        "emergency_aircraft_count": len(status["emergency_aircraft"]),
        "emergency_aircraft": [
            {"id": a.id, "tail_number": a.tail_number, "state": a.state}
            for a in status["emergency_aircraft"]
        ],
        "locked_pads_count": len(status["locked_pads"]),
        "locked_pads": [
            {"id": p.id, "name": p.name, "state": p.state}
            for p in status["locked_pads"]
        ],
        "aborted_workflows_today": len(status["aborted_workflows_today"]),
    }