"""
Vertipad API routes.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db_session, get_current_operator
from app.schemas.pad import (
    VertipadInitialize,
    VertipadResponse,
    VertipadStateTransition,
    VertipadOccupy,
)
from app.schemas.aircraft import AircraftResponse
from app.services.aircraft_service import AircraftService
from app.services.pad_service import PadService
from app.services.pad_queue_service import PadQueueService
from app.core.realtime import broadcast_system_update_sync
from typing import List


router = APIRouter(prefix="/pad", tags=["pad"])


def _serialize_pad_with_queue(pad: VertipadResponse | object) -> dict:
    payload = VertipadResponse.model_validate(pad).model_dump()
    payload["queue"] = PadQueueService.get_queue(payload["id"])
    return payload




@router.post("/initialize", response_model=VertipadResponse, status_code=201)
def initialize_pad(
    data: VertipadInitialize,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Initialize vertipad configuration"""
    pad = PadService.initialize_pad(
        db=db,
        pad_id=data.pad_id,
        name=data.name,
        latitude=data.latitude,
        longitude=data.longitude,
        elevation_m=data.elevation_m,
        diameter_m=data.diameter_m,
        max_weight_kg=data.max_weight_kg,
        charging_power_kw=data.charging_power_kw,
    )
    broadcast_system_update_sync(db)
    return _serialize_pad_with_queue(pad)


@router.get("/{pad_id}", response_model=VertipadResponse)
def get_pad(
    pad_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Get vertipad by ID"""
    pad = PadService.get_pad(db, pad_id)
    return _serialize_pad_with_queue(pad)

@router.get("/", response_model=list[VertipadResponse])
def list_pads(
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """List all vertipads"""
    pads = PadService.list_pads(db)
    return [_serialize_pad_with_queue(pad) for pad in pads]


@router.get("/{pad_id}/aircraft", response_model=List[AircraftResponse])
def get_aircraft_on_pad(
    pad_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """List aircraft currently associated with the given pad."""
    return AircraftService.get_aircraft_by_pad(db=db, pad_id=pad_id)


@router.post("/{pad_id}/transition", response_model=VertipadResponse)
def transition_pad_state(
    pad_id: str,
    data: VertipadStateTransition,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Transition pad to new state"""
    pad = PadService.transition_pad_state(
        db=db,
        pad_id=pad_id,
        target_state=data.target_state,
        operator_id=operator,
    )
    broadcast_system_update_sync(db)
    return _serialize_pad_with_queue(pad)


@router.post("/{pad_id}/occupy", response_model=VertipadResponse)
def occupy_pad(
    pad_id: str,
    data: VertipadOccupy,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Mark pad as occupied by aircraft"""
    pad = PadService.occupy_pad(
        db=db,
        pad_id=pad_id,
        aircraft_id=data.aircraft_id,
        priority=data.priority,
    )
    broadcast_system_update_sync(db)
    return _serialize_pad_with_queue(pad)


@router.post("/{pad_id}/release", response_model=VertipadResponse)
def release_pad(
    pad_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Release pad back to available"""
    pad = PadService.release_pad(db=db, pad_id=pad_id)
    broadcast_system_update_sync(db)
    return _serialize_pad_with_queue(pad)