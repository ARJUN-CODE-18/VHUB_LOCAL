"""
Workflow database model.
Orchestrates end-to-end operational sequences.
"""
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin
from app.core.fsm.workflow_fsm import WorkflowType, WorkflowState
from typing import Any
import uuid


class Workflow(Base, TimestampMixin):
    """Operational workflow tracking"""
    __tablename__ = "workflows"
    
    # Primary identifier
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Workflow classification
    workflow_type: Any = Column(SQLEnum(WorkflowType), nullable=False, index=True)
    state: Any = Column(
        SQLEnum(WorkflowState),
        nullable=False,
        default=WorkflowState.INITIATED,
        index=True,
    )
    
    # Foreign keys
    aircraft_id = Column(String(36), ForeignKey("aircraft.id"), nullable=False)
    vertipad_id = Column(String(20), ForeignKey("vertipad.id"), nullable=False)
    slot_id = Column(String(36), ForeignKey("slots.id"), nullable=True)
    
    # Timing
    initiated_at: Any = Column(DateTime, nullable=False, index=True)
    completed_at: Any = Column(DateTime, nullable=True)
    
    # Operational milestones
    approach_cleared_at: Any = Column(DateTime, nullable=True)
    landing_cleared_at: Any = Column(DateTime, nullable=True)
    landed_at: Any = Column(DateTime, nullable=True)
    departure_cleared_at: Any = Column(DateTime, nullable=True)
    
    # Status
    is_emergency: Any = Column(Boolean, default=False, nullable=False)
    completion_notes: Any = Column(Text, nullable=True)
    
    # Relationships
    # The explicit back-populates to Aircraft/Vertipad/Slot were removed
    # to decouple Workflow from those models. Keep foreign keys above.
    
    def __repr__(self):
        return f"<Workflow {self.id} {self.workflow_type} {self.state}>"