"""
Scheduler service used by operations endpoint.
Creates near-term landing/taxi slots on the first available vertipad.
"""

from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.fsm.pad_fsm import VertipadState
from app.db.models.slot import SlotType
from app.db.models.vertipad import Vertipad
from app.services.slot_service import SlotService


class SchedulerService:
	"""Compatibility service for scheduling dashboard operations."""

	def __init__(self, db: Session):
		self.db = db

	def schedule_operation(self, aircraft_id: str, operation_type: str):
		"""
		Schedule a landing or taxi operation as a slot reservation.

		LANDING -> ARRIVAL slot
		TAXI -> DEPARTURE slot
		"""
		operation = operation_type.strip().upper()

		if operation == "LANDING":
			slot_type = SlotType.ARRIVAL
			duration_minutes = 20
		elif operation == "TAXI":
			slot_type = SlotType.DEPARTURE
			duration_minutes = 15
		else:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="operation_type must be LANDING or TAXI",
			)

		pad = (
			self.db.query(Vertipad)
			.filter(
				Vertipad.is_operational.is_(True),
				Vertipad.state == VertipadState.AVAILABLE,
			)
			.order_by(Vertipad.id.asc())
			.first()
		)

		if not pad:
			raise HTTPException(
				status_code=status.HTTP_409_CONFLICT,
				detail="No available vertipad for scheduling",
			)

		start_time = datetime.utcnow() + timedelta(minutes=5)

		slot = SlotService.create_slot(
			db=self.db,
			vertipad_id=str(pad.id),
			aircraft_id=str(aircraft_id),
			slot_type=slot_type,
			start_time=start_time,
			duration_minutes=duration_minutes,
		)

		return {
			"message": "Operation scheduled",
			"operation_type": operation,
			"slot_id": slot.id,
			"vertipad_id": slot.vertipad_id,
			"aircraft_id": slot.aircraft_id,
			"start_time": slot.start_time,
			"end_time": slot.end_time,
			"status": slot.status,
		}
