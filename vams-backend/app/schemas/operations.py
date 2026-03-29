"""
Schemas for operations scheduling endpoints.
"""
from datetime import datetime
from enum import Enum
from typing import Optional
import logging

from pydantic import BaseModel, Field, field_validator
from app.core.priority import PriorityLevel

logger = logging.getLogger(__name__)


class OperationType(str, Enum):
    TAXI = "TAXI"
    LANDING = "LANDING"


class OperationScheduleRequest(BaseModel):
    aircraft_id: str = Field(..., min_length=1)
    operation_type: OperationType
    pad_id: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    priority: PriorityLevel = PriorityLevel.NORMAL

    @field_validator("operation_type", mode="before")
    @classmethod
    def normalize_operation_type(cls, value):
        if isinstance(value, str):
            return value.strip().upper()
        return value

    @field_validator("pad_id")
    @classmethod
    def normalize_pad_id(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("scheduled_time", mode="before")
    @classmethod
    def normalize_scheduled_time(cls, value):
        logger.info("SCHEMA_VALIDATOR: scheduled_time received: value=%s (type=%s)", value, type(value).__name__)
        
        if value is None or value == "":
            logger.info("SCHEMA_VALIDATOR: scheduled_time is None or empty")
            return None

        if isinstance(value, datetime):
            logger.info("SCHEMA_VALIDATOR: scheduled_time is already datetime: %s", value)
            return value

        if isinstance(value, str):
            try:
                parsed = datetime.strptime(value.strip(), "%Y-%m-%dT%H:%M:%S")
                logger.info("SCHEMA_VALIDATOR: Successfully parsed datetime: %s -> %s", value, parsed)
                return parsed
            except ValueError as exc:
                logger.error("SCHEMA_VALIDATOR: Failed to parse datetime: %s (format expected: YYYY-MM-DDTHH:MM:SS)", value)
                raise ValueError("Invalid datetime format. Use YYYY-MM-DDTHH:MM:SS") from exc

        raise ValueError("Invalid datetime format. Use YYYY-MM-DDTHH:MM:SS")


class ScheduledSlotInfo(BaseModel):
    id: str
    vertipad_id: str
    aircraft_id: str
    slot_type: str
    status: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int


class ScheduledAircraftInfo(BaseModel):
    id: str
    tail_number: str
    state: str
    is_emergency: bool
    battery_level: Optional[float]


class OperationScheduleResponse(BaseModel):
    message: str
    operation_type: OperationType
    status: str = "SCHEDULED"  # SCHEDULED / QUEUED / OVERRIDDEN
    queued_pad_id: Optional[str] = None
    queue_position: Optional[int] = None
    slot: Optional[ScheduledSlotInfo] = None
    aircraft: ScheduledAircraftInfo
