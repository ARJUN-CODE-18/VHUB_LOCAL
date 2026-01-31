"""
Slot service layer for time-based vertipad reservations.
Handles slot booking, conflict detection, and scheduling logic.
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
from app.db.models.slot import Slot, SlotType, SlotStatus
from app.db.models.vertipad import Vertipad
from app.db.models.aircraft import Aircraft
from app.db.models.audit import AuditLog
from app.core.events import EventLogger, EventType, EventSeverity
from app.core.config import settings
from fastapi import HTTPException, status
import uuid


class SlotService:
    """Business logic for slot management"""
    
    @staticmethod
    def create_slot(
        db: Session,
        vertipad_id: str,
        aircraft_id: str,
        slot_type: SlotType,
        start_time: datetime,
        duration_minutes: int,
        priority: int = 0,
        operator_id: Optional[str] = None,
    ) -> Slot:
        """
        Create a new slot reservation with conflict detection.
        
        Args:
            db: Database session
            vertipad_id: Target vertipad
            aircraft_id: Aircraft requesting slot
            slot_type: ARRIVAL or DEPARTURE
            start_time: Slot start time
            duration_minutes: Slot duration
            priority: Priority level for conflict resolution
            operator_id: Operator creating slot
            
        Returns:
            Created slot entity
            
        Raises:
            HTTPException: If validation fails or conflicts exist
        """
        # Validate vertipad exists and is operational
        pad = db.query(Vertipad).filter(Vertipad.id == vertipad_id).first()
        if not pad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vertipad {vertipad_id} not found",
            )
        
        if not pad.is_operational:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vertipad {vertipad_id} is not operational",
            )
        
        # Validate aircraft exists
        aircraft = db.query(Aircraft).filter(Aircraft.id == aircraft_id).first()
        if not aircraft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aircraft {aircraft_id} not found",
            )
        
        # Validate time window
        if start_time < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create slot in the past",
            )
        
        max_advance = timedelta(hours=settings.MAX_SLOT_BOOKING_HOURS)
        if start_time > datetime.utcnow() + max_advance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot book slots more than {settings.MAX_SLOT_BOOKING_HOURS} hours in advance",
            )
        
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        # Check for conflicts
        conflicts = SlotService._check_slot_conflicts(
            db, vertipad_id, start_time, end_time, None
        )
        
        if conflicts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Slot conflicts with existing reservations: {[c.id for c in conflicts]}",
            )
        
        # Create slot
        slot = Slot(
            id=str(uuid.uuid4()),
            slot_type=slot_type,
            status=SlotStatus.REQUESTED,
            start_time=start_time,
            end_time=end_time,
            duration_minutes=duration_minutes,
            vertipad_id=vertipad_id,
            aircraft_id=aircraft_id,
            priority=priority,
        )
        
        db.add(slot)
        db.flush()
        
        # Log event
        event = EventLogger.create_event(
            event_type=EventType.SLOT_CREATED,
            severity=EventSeverity.INFO,
            entity_type="slot",
            entity_id=slot.id,
            details={
                "slot_type": slot_type,
                "vertipad_id": vertipad_id,
                "aircraft_id": aircraft_id,
                "start_time": start_time.isoformat(),
                "duration_minutes": duration_minutes,
            },
            operator_id=operator_id,
        )
        
        audit_log = AuditLog(
            event_type=event.event_type,
            severity=event.severity,
            timestamp=event.timestamp,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            details=event.to_json(),
            operator_id=operator_id,
        )
        db.add(audit_log)
        db.commit()
        db.refresh(slot)
        
        return slot
    
    @staticmethod
    def confirm_slot(
        db: Session,
        slot_id: str,
        operator_id: Optional[str] = None,
    ) -> Slot:
        """Confirm a requested slot"""
        slot = db.query(Slot).filter(Slot.id == slot_id).first()
        
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Slot {slot_id} not found",
            )
        
        if slot.status != SlotStatus.REQUESTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Slot {slot_id} cannot be confirmed (status: {slot.status})",
            )
        
        # Check for conflicts again (defensive)
        conflicts = SlotService._check_slot_conflicts(
            db, slot.vertipad_id, slot.start_time, slot.end_time, str(slot.id)
        )
        
        if conflicts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Slot now conflicts with other reservations",
            )
        
        slot.status = SlotStatus.CONFIRMED
        
        # Log event
        event = EventLogger.create_event(
            event_type=EventType.SLOT_CONFIRMED,
            severity=EventSeverity.INFO,
            entity_type="slot",
            entity_id=slot.id,
            details={"confirmed": True},
            operator_id=operator_id,
        )
        
        audit_log = AuditLog(
            event_type=event.event_type,
            severity=event.severity,
            timestamp=event.timestamp,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            details=event.to_json(),
            operator_id=operator_id,
        )
        db.add(audit_log)
        
        db.commit()
        db.refresh(slot)
        
        return slot
    
    @staticmethod
    def activate_slot(db: Session, slot_id: str) -> Slot:
        """Activate a confirmed slot (aircraft has arrived)"""
        slot = db.query(Slot).filter(Slot.id == slot_id).first()
        
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Slot {slot_id} not found",
            )
        
        if slot.status != SlotStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Slot must be CONFIRMED to activate (current: {slot.status})",
            )
        
        slot.status = SlotStatus.ACTIVE
        db.commit()
        db.refresh(slot)
        
        return slot
    
    @staticmethod
    def complete_slot(db: Session, slot_id: str) -> Slot:
        """Mark slot as completed"""
        slot = db.query(Slot).filter(Slot.id == slot_id).first()
        
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Slot {slot_id} not found",
            )
        
        if slot.status not in [SlotStatus.ACTIVE, SlotStatus.CONFIRMED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Slot cannot be completed from status {slot.status}",
            )
        
        slot.status = SlotStatus.COMPLETED
        db.commit()
        db.refresh(slot)
        
        return slot
    
    @staticmethod
    def cancel_slot(
        db: Session,
        slot_id: str,
        operator_id: Optional[str] = None,
    ) -> Slot:
        """Cancel a slot reservation"""
        slot = db.query(Slot).filter(Slot.id == slot_id).first()
        
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Slot {slot_id} not found",
            )
        
        if slot.status in [SlotStatus.COMPLETED, SlotStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Slot {slot_id} is already {slot.status}",
            )
        
        slot.status = SlotStatus.CANCELLED
        
        # Log event
        event = EventLogger.create_event(
            event_type=EventType.SLOT_CANCELLED,
            severity=EventSeverity.INFO,
            entity_type="slot",
            entity_id=slot.id,
            details={"cancelled": True},
            operator_id=operator_id,
        )
        
        audit_log = AuditLog(
            event_type=event.event_type,
            severity=event.severity,
            timestamp=event.timestamp,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            details=event.to_json(),
            operator_id=operator_id,
        )
        db.add(audit_log)
        
        db.commit()
        db.refresh(slot)
        
        return slot
    
    @staticmethod
    def get_slot(db: Session, slot_id: str) -> Slot:
        """Get slot by ID"""
        slot = db.query(Slot).filter(Slot.id == slot_id).first()
        
        if not slot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Slot {slot_id} not found",
            )
        
        return slot
    
    @staticmethod
    def list_slots(
        db: Session,
        vertipad_id: Optional[str] = None,
        aircraft_id: Optional[str] = None,
        status: Optional[SlotStatus] = None,
        start_after: Optional[datetime] = None,
        start_before: Optional[datetime] = None,
    ) -> List[Slot]:
        """List slots with optional filters"""
        query = db.query(Slot)
        
        if vertipad_id:
            query = query.filter(Slot.vertipad_id == vertipad_id)
        
        if aircraft_id:
            query = query.filter(Slot.aircraft_id == aircraft_id)
        
        if status:
            query = query.filter(Slot.status == status)
        
        if start_after:
            query = query.filter(Slot.start_time >= start_after)
        
        if start_before:
            query = query.filter(Slot.start_time <= start_before)
        
        return query.order_by(Slot.start_time).all()
    
    @staticmethod
    def _check_slot_conflicts(
        db: Session,
        vertipad_id: str,
        start_time: datetime,
        end_time: datetime,
        exclude_slot_id: Optional[str] = None,
    ) -> List[Slot]:
        """
        Check for conflicting slots in the time window.
        
        Returns:
            List of conflicting slots (empty if no conflicts)
        """
        query = db.query(Slot).filter(
            and_(
                Slot.vertipad_id == vertipad_id,
                Slot.status.in_([SlotStatus.REQUESTED, SlotStatus.CONFIRMED, SlotStatus.ACTIVE]),
                or_(
                    # New slot starts during existing slot
                    and_(
                        Slot.start_time <= start_time,
                        Slot.end_time > start_time,
                    ),
                    # New slot ends during existing slot
                    and_(
                        Slot.start_time < end_time,
                        Slot.end_time >= end_time,
                    ),
                    # New slot completely contains existing slot
                    and_(
                        Slot.start_time >= start_time,
                        Slot.end_time <= end_time,
                    ),
                ),
            )
        )
        
        if exclude_slot_id:
            query = query.filter(Slot.id != exclude_slot_id)
        
        return query.all()