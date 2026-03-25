"""
Scheduler service used by operations endpoint.
Creates near-term landing/taxi slots on the first available vertipad.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.fsm.pad_fsm import VertipadState
from app.core.fsm.aircraft_fsm import AircraftFSM, AircraftState
from app.core.pad_catalog import STATIC_PAD_IDS
from app.core.priority import PriorityLevel
from app.db.models.aircraft import Aircraft
from app.db.models.slot import SlotType
from app.db.models.vertipad import Vertipad
from app.services.aircraft_service import AircraftService
from app.services.pad_service import PadService
from app.services.pad_queue_service import PadQueueService
from app.services.slot_service import SlotService


logger = logging.getLogger(__name__)


class SchedulerService:
	"""Compatibility service for scheduling dashboard operations."""

	def __init__(self, db: Session):
		self.db = db

	def schedule_operation(
		self,
		aircraft_id: str,
		operation_type: str,
		priority: PriorityLevel = PriorityLevel.NORMAL,
		pad_id: Optional[str] = None,
		scheduled_time: Optional[datetime] = None,
		operator_id: Optional[str] = None,
	):
		"""
		Schedule a landing or taxi operation as a slot reservation.

		LANDING -> ARRIVAL slot
		TAXI -> DEPARTURE slot
		"""
		operation = operation_type.strip().upper()

		aircraft = self.db.query(Aircraft).filter(Aircraft.id == aircraft_id).first()
		if not aircraft:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail=f"Aircraft {aircraft_id} not found",
			)

		if operation == "LANDING":
			slot_type = SlotType.ARRIVAL
			duration_minutes = 20
			allowed_landing_states = {
				AircraftState.EN_ROUTE_INBOUND,
				AircraftState.APPROACH,
				AircraftState.FINAL_APPROACH,
			}
			if aircraft.state not in allowed_landing_states:
				raise HTTPException(
					status_code=status.HTTP_400_BAD_REQUEST,
					detail=f"Invalid aircraft state for landing: {aircraft.state.value}",
				)
		elif operation == "TAXI":
			slot_type = SlotType.DEPARTURE
			duration_minutes = 15
		else:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail="operation_type must be LANDING or TAXI",
			)

		normalized_scheduled_time: Optional[datetime] = None
		if scheduled_time:
			if scheduled_time.tzinfo is None:
				normalized_scheduled_time = scheduled_time.replace(tzinfo=timezone.utc)
			else:
				normalized_scheduled_time = scheduled_time.astimezone(timezone.utc)

			if normalized_scheduled_time < datetime.now(timezone.utc):
				raise HTTPException(
					status_code=status.HTTP_400_BAD_REQUEST,
					detail="scheduled_time cannot be in the past",
				)

		if pad_id:
			if pad_id not in STATIC_PAD_IDS:
				logger.warning("Rejected schedule request for unknown pad_id=%s", pad_id)
				raise HTTPException(
					status_code=status.HTTP_400_BAD_REQUEST,
					detail=f"Invalid pad_id: {pad_id}",
				)

			pad = (
				self.db.query(Vertipad)
				.filter(
					Vertipad.id == pad_id,
					Vertipad.is_operational.is_(True),
				)
				.first()
			)
			logger.info("PAD FOUND: %s", pad.id if pad else None)

			if not pad:
				raise HTTPException(
					status_code=status.HTTP_404_NOT_FOUND,
					detail=f"Vertipad {pad_id} not found or is not operational",
				)

			if (
				pad.current_aircraft_id is not None
				or pad.state != VertipadState.AVAILABLE
			):
				logger.info("PAD STATUS: %s %s", pad.id, pad.current_aircraft_id)
				if priority == PriorityLevel.CRITICAL:
					pad = PadService.occupy_pad(
						db=self.db,
						pad_id=pad_id,
						aircraft_id=aircraft_id,
						priority=PriorityLevel.CRITICAL,
					)
					self.db.refresh(aircraft)
					return {
						"message": f"Critical override executed on {pad_id}.",
						"operation_type": operation,
						"status": "OVERRIDDEN",
						"queued_pad_id": None,
						"queue_position": None,
						"slot": None,
						"aircraft": {
							"id": aircraft.id,
							"tail_number": aircraft.tail_number,
							"state": aircraft.state.value,
							"is_emergency": aircraft.is_emergency,
							"battery_level": aircraft.battery_level,
						},
					}

				queue_position = PadQueueService.add_to_queue(
					pad_id=pad_id,
					aircraft_id=aircraft_id,
					priority=priority,
				)
				self.db.commit()
				self.db.refresh(aircraft)
				return {
					"message": f"Vertipad {pad_id} occupied. Aircraft queued.",
					"operation_type": operation,
					"status": "QUEUED",
					"queued_pad_id": pad_id,
					"queue_position": queue_position,
					"slot": None,
					"aircraft": {
						"id": aircraft.id,
						"tail_number": aircraft.tail_number,
						"state": aircraft.state.value,
						"is_emergency": aircraft.is_emergency,
						"battery_level": aircraft.battery_level,
					},
				}

			if pad.current_aircraft_id is not None:
				raise HTTPException(
					status_code=status.HTTP_409_CONFLICT,
					detail=f"Vertipad {pad_id} is not available",
				)
		else:
			pad = (
				self.db.query(Vertipad)
				.filter(
					Vertipad.id.in_(STATIC_PAD_IDS),
					Vertipad.is_operational.is_(True),
					Vertipad.state == VertipadState.AVAILABLE,
					Vertipad.current_aircraft_id.is_(None),
				)
				.order_by(Vertipad.id.asc())
				.first()
			)

		if not pad:
			raise HTTPException(
				status_code=status.HTTP_409_CONFLICT,
				detail="No available vertipad for scheduling",
			)

		start_time = (
			normalized_scheduled_time.replace(tzinfo=None)
			if normalized_scheduled_time
			else (datetime.utcnow() + timedelta(minutes=5))
		)

		slot = SlotService.create_slot(
			db=self.db,
			vertipad_id=str(pad.id),
			aircraft_id=str(aircraft_id),
			slot_type=slot_type,
			start_time=start_time,
			duration_minutes=duration_minutes,
			operator_id=operator_id,
		)

		# Occupancy is backend authoritative; assigning an operation to a pad binds aircraft<->pad.
		pad = PadService.occupy_pad(
			db=self.db,
			pad_id=str(pad.id),
			aircraft_id=str(aircraft_id),
			priority=priority,
		)

		if operation == "TAXI":
			aircraft.pad_id = slot.vertipad_id

		target_state: Optional[AircraftState] = None
		if operation == "LANDING":
			if AircraftFSM.can_transition(aircraft.state, AircraftState.EN_ROUTE_INBOUND):
				target_state = AircraftState.EN_ROUTE_INBOUND
			elif AircraftFSM.can_transition(aircraft.state, AircraftState.APPROACH):
				target_state = AircraftState.APPROACH
		elif operation == "TAXI" and AircraftFSM.can_transition(aircraft.state, AircraftState.TAXIING):
			target_state = AircraftState.TAXIING

		if target_state and target_state != aircraft.state:
			aircraft = AircraftService.transition_aircraft_state(
				db=self.db,
				aircraft_id=aircraft.id,
				target_state=target_state,
				operator_id=operator_id,
			)
		elif operation == "TAXI":
			self.db.commit()
			self.db.refresh(aircraft)

		return {
			"message": "Operation scheduled",
			"operation_type": operation,
			"status": "SCHEDULED",
			"queued_pad_id": None,
			"queue_position": None,
			"slot": {
				"id": slot.id,
				"vertipad_id": slot.vertipad_id,
				"aircraft_id": slot.aircraft_id,
				"slot_type": slot.slot_type.value,
				"status": slot.status.value,
				"start_time": slot.start_time,
				"end_time": slot.end_time,
				"duration_minutes": slot.duration_minutes,
			},
			"aircraft": {
				"id": aircraft.id,
				"tail_number": aircraft.tail_number,
				"state": aircraft.state.value,
				"is_emergency": aircraft.is_emergency,
				"battery_level": aircraft.battery_level,
			},
		}
