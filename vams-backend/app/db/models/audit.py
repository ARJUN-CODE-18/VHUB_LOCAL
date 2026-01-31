"""
Audit database model.
Immutable log of all system events for compliance and debugging.
"""
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, Text, Index
from app.db.base import Base
from app.core.events import EventType, EventSeverity
from typing import Any
import uuid


class AuditLog(Base):
    """Immutable audit trail for all system events"""
    __tablename__ = "audit_logs"
    
    # Primary identifier
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Event classification
    event_type: Any = Column(SQLEnum(EventType), nullable=False, index=True)
    severity: Any = Column(SQLEnum(EventSeverity), nullable=False, index=True)
    
    # Timing
    timestamp: Any = Column(DateTime, nullable=False, index=True)
    
    # Entity reference
    entity_type: Any = Column(String(50), nullable=False, index=True)
    entity_id: Any = Column(String(36), nullable=True, index=True)
    
    # Event details (JSON string)
    details: Any = Column(Text, nullable=False)
    
    # Operator tracking
    operator_id: Any = Column(String(100), nullable=True, index=True)
    
    # Composite index for common queries
    __table_args__ = (
        Index('idx_audit_time_type', 'timestamp', 'event_type'),
        Index('idx_audit_entity', 'entity_type', 'entity_id'),
    )
    
    def __repr__(self):
        return f"<AuditLog {self.event_type} {self.timestamp}>"