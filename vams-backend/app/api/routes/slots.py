"""
Slot API routes.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.api.deps import get_db_session, get_current_operator
from app.schemas.slot import SlotCreate, SlotResponse
from app.services.slot_service import SlotService
from app.db.models.slot import SlotStatus


router = APIRouter(prefix="/slots", tags=["slots"])


@router.post("/", response_model=SlotResponse, status_code=201)
def create_slot(
    data: SlotCreate,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Create a new slot reservation"""
    slot = SlotService.create_slot(
        db=db,
        vertipad_id=data.vertipad_id,
        aircraft_id=data.aircraft_id,
        slot_type=data.slot_type,
        start_time=data.start_time,
        duration_minutes=data.duration_minutes,
        priority=data.priority,
        operator_id=operator,
    )
    return slot


@router.get("/{slot_id}", response_model=SlotResponse)
def get_slot(
    slot_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Get slot by ID"""
    slot = SlotService.get_slot(db, slot_id)
    return slot


@router.get("/", response_model=List[SlotResponse])
def list_slots(
    vertipad_id: Optional[str] = Query(None),
    aircraft_id: Optional[str] = Query(None),
    status: Optional[SlotStatus] = Query(None),
    start_after: Optional[datetime] = Query(None),
    start_before: Optional[datetime] = Query(None),
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """List slots with optional filters"""
    slots = SlotService.list_slots(
        db=db,
        vertipad_id=vertipad_id,
        aircraft_id=aircraft_id,
        status=status,
        start_after=start_after,
        start_before=start_before,
    )
    return slots


@router.post("/{slot_id}/confirm", response_model=SlotResponse)
def confirm_slot(
    slot_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Confirm a requested slot"""
    slot = SlotService.confirm_slot(db=db, slot_id=slot_id, operator_id=operator)
    return slot


@router.post("/{slot_id}/activate", response_model=SlotResponse)
def activate_slot(
    slot_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Activate a confirmed slot"""
    slot = SlotService.activate_slot(db=db, slot_id=slot_id)
    return slot


@router.post("/{slot_id}/complete", response_model=SlotResponse)
def complete_slot(
    slot_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Mark slot as completed"""
    slot = SlotService.complete_slot(db=db, slot_id=slot_id)
    return slot


@router.delete("/{slot_id}", response_model=SlotResponse)
def cancel_slot(
    slot_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Cancel a slot reservation"""
    slot = SlotService.cancel_slot(db=db, slot_id=slot_id, operator_id=operator)
    return slot