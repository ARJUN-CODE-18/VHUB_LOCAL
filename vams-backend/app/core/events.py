"""
Event system for audit logging and system monitoring.
All critical state changes must be logged for certification.
"""
from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel

# Allow event entity ids to be any runtime value (ORM ids, strings, etc.) for flexibility in services

import json


class EventType(str, Enum):
    """All auditable event types in VAMS"""
    # Aircraft events
    AIRCRAFT_REGISTERED = "AIRCRAFT_REGISTERED"
    AIRCRAFT_STATE_CHANGED = "AIRCRAFT_STATE_CHANGED"
    AIRCRAFT_DEREGISTERED = "AIRCRAFT_DEREGISTERED"
    
    # Pad events
    PAD_STATE_CHANGED = "PAD_STATE_CHANGED"
    PAD_RESERVED = "PAD_RESERVED"
    PAD_RELEASED = "PAD_RELEASED"
    
    # Slot events
    SLOT_CREATED = "SLOT_CREATED"
    SLOT_CONFIRMED = "SLOT_CONFIRMED"
    SLOT_CANCELLED = "SLOT_CANCELLED"
    
    # Workflow events
    WORKFLOW_INITIATED = "WORKFLOW_INITIATED"
    WORKFLOW_STATE_CHANGED = "WORKFLOW_STATE_CHANGED"
    WORKFLOW_COMPLETED = "WORKFLOW_COMPLETED"
    
    # Weather events
    WEATHER_UPDATED = "WEATHER_UPDATED"
    WEATHER_CONSTRAINT_VIOLATED = "WEATHER_CONSTRAINT_VIOLATED"
    
    # Energy events
    CHARGING_STARTED = "CHARGING_STARTED"
    CHARGING_STOPPED = "CHARGING_STOPPED"
    BATTERY_THRESHOLD_ALERT = "BATTERY_THRESHOLD_ALERT"
    
    # Emergency events
    EMERGENCY_DECLARED = "EMERGENCY_DECLARED"
    EMERGENCY_CLEARED = "EMERGENCY_CLEARED"
    
    # System events
    SYSTEM_STARTUP = "SYSTEM_STARTUP"
    SYSTEM_SHUTDOWN = "SYSTEM_SHUTDOWN"


class EventSeverity(str, Enum):
    """Event severity levels"""
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class AuditEvent(BaseModel):
    """Structured audit event for logging"""
    event_type: EventType
    severity: EventSeverity
    timestamp: datetime
    entity_type: str  # aircraft, vertipad, slot, workflow
    entity_id: Optional[Any] = None
    details: Dict[str, Any]
    operator_id: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True
    
    def to_json(self) -> str:
        """Serialize event to JSON for storage"""
        return json.dumps({
            "event_type": self.event_type,
            "severity": self.severity,
            "timestamp": self.timestamp.isoformat(),
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "details": self.details,
            "operator_id": self.operator_id,
        })


class EventLogger:
    """
    Centralized event logging for audit trail.
    All events are persisted to database via audit service.
    """
    
    @staticmethod
    def create_event(
        event_type: EventType,
        severity: EventSeverity,
        entity_type: str,
        entity_id: Optional[Any] = None,
        details: Optional[Dict[str, Any]] = None,
        operator_id: Optional[str] = None,
    ) -> AuditEvent:
        """Create a new audit event"""
        return AuditEvent(
            event_type=event_type,
            severity=severity,
            timestamp=datetime.utcnow(),
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
            operator_id=operator_id,
        )