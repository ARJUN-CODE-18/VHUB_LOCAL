"""
Workflow Finite State Machine
Orchestrates end-to-end aircraft operational workflows (arrival/departure).
Safety-critical: Ensures proper sequencing of operations.
"""
from enum import Enum
from typing import Set


class WorkflowType(str, Enum):
    """Types of operational workflows"""
    ARRIVAL = "ARRIVAL"
    DEPARTURE = "DEPARTURE"
    TURNAROUND = "TURNAROUND"  # Arrival + Departure


class WorkflowState(str, Enum):
    """All valid workflow states per VAMS specification"""
    INITIATED = "INITIATED"
    SLOT_RESERVED = "SLOT_RESERVED"
    APPROACH_CLEARED = "APPROACH_CLEARED"
    LANDING_CLEARED = "LANDING_CLEARED"
    LANDED = "LANDED"
    GROUND_OPS = "GROUND_OPS"
    CHARGING = "CHARGING"
    PRE_DEPARTURE_CHECK = "PRE_DEPARTURE_CHECK"
    DEPARTURE_CLEARED = "DEPARTURE_CLEARED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    EMERGENCY_ABORTED = "EMERGENCY_ABORTED"


class WorkflowFSMViolation(Exception):
    """Raised when an invalid workflow transition is attempted"""
    pass


class WorkflowFSM:
    """
    Workflow Finite State Machine with strict sequencing validation.
    Coordinates aircraft and pad FSMs for complete operations.
    """
    
    # Arrival workflow transitions
    ARRIVAL_TRANSITIONS = {
        WorkflowState.INITIATED: {
            WorkflowState.SLOT_RESERVED,
            WorkflowState.CANCELLED,
            WorkflowState.EMERGENCY_ABORTED,
        },
        WorkflowState.SLOT_RESERVED: {
            WorkflowState.APPROACH_CLEARED,
            WorkflowState.CANCELLED,
            WorkflowState.EMERGENCY_ABORTED,
        },
        WorkflowState.APPROACH_CLEARED: {
            WorkflowState.LANDING_CLEARED,
            WorkflowState.SLOT_RESERVED,  # Go-around
            WorkflowState.EMERGENCY_ABORTED,
        },
        WorkflowState.LANDING_CLEARED: {
            WorkflowState.LANDED,
            WorkflowState.APPROACH_CLEARED,  # Go-around
            WorkflowState.EMERGENCY_ABORTED,
        },
        WorkflowState.LANDED: {
            WorkflowState.GROUND_OPS,
            WorkflowState.COMPLETED,
            WorkflowState.EMERGENCY_ABORTED,
        },
        WorkflowState.GROUND_OPS: {
            WorkflowState.CHARGING,
            WorkflowState.COMPLETED,
            WorkflowState.EMERGENCY_ABORTED,
        },
        WorkflowState.CHARGING: {
            WorkflowState.COMPLETED,
            WorkflowState.EMERGENCY_ABORTED,
        },
    }
    
    # Departure workflow transitions
    DEPARTURE_TRANSITIONS = {
        WorkflowState.INITIATED: {
            WorkflowState.SLOT_RESERVED,
            WorkflowState.CANCELLED,
            WorkflowState.EMERGENCY_ABORTED,
        },
        WorkflowState.SLOT_RESERVED: {
            WorkflowState.PRE_DEPARTURE_CHECK,
            WorkflowState.CANCELLED,
            WorkflowState.EMERGENCY_ABORTED,
        },
        WorkflowState.PRE_DEPARTURE_CHECK: {
            WorkflowState.DEPARTURE_CLEARED,
            WorkflowState.CANCELLED,
            WorkflowState.EMERGENCY_ABORTED,
        },
        WorkflowState.DEPARTURE_CLEARED: {
            WorkflowState.COMPLETED,
            WorkflowState.EMERGENCY_ABORTED,
        },
    }
    
    # Terminal states (no outgoing transitions except emergency abort)
    TERMINAL_STATES = {
        WorkflowState.COMPLETED,
        WorkflowState.CANCELLED,
        WorkflowState.EMERGENCY_ABORTED,
    }
    
    @classmethod
    def validate_transition(
        cls,
        workflow_type: WorkflowType,
        current_state: WorkflowState,
        target_state: WorkflowState,
    ) -> None:
        """
        Validate if workflow transition is allowed based on type.
        
        Args:
            workflow_type: Type of workflow (ARRIVAL/DEPARTURE)
            current_state: Current workflow state
            target_state: Desired target state
            
        Raises:
            WorkflowFSMViolation: If transition is not permitted
        """
        # Select appropriate transition map
        if workflow_type == WorkflowType.ARRIVAL:
            transitions = cls.ARRIVAL_TRANSITIONS
        elif workflow_type == WorkflowType.DEPARTURE:
            transitions = cls.DEPARTURE_TRANSITIONS
        elif workflow_type == WorkflowType.TURNAROUND:
            # Turnaround uses arrival transitions, then departure
            transitions = {**cls.ARRIVAL_TRANSITIONS, **cls.DEPARTURE_TRANSITIONS}
        else:
            raise WorkflowFSMViolation(f"Unknown workflow type: {workflow_type}")
        
        if current_state not in transitions:
            raise WorkflowFSMViolation(
                f"Unknown current state: {current_state} for {workflow_type}"
            )
        
        allowed_transitions = transitions[current_state]
        
        if target_state not in allowed_transitions:
            raise WorkflowFSMViolation(
                f"Invalid {workflow_type} workflow transition from {current_state} "
                f"to {target_state}. Allowed: {allowed_transitions}"
            )
    
    @classmethod
    def can_transition(
        cls,
        workflow_type: WorkflowType,
        current_state: WorkflowState,
        target_state: WorkflowState,
    ) -> bool:
        """Check if transition is valid without raising exception"""
        try:
            cls.validate_transition(workflow_type, current_state, target_state)
            return True
        except WorkflowFSMViolation:
            return False
    
    @classmethod
    def get_allowed_transitions(
        cls,
        workflow_type: WorkflowType,
        current_state: WorkflowState,
    ) -> Set[WorkflowState]:
        """Get all allowed transitions from current state"""
        if workflow_type == WorkflowType.ARRIVAL:
            return cls.ARRIVAL_TRANSITIONS.get(current_state, set())
        elif workflow_type == WorkflowType.DEPARTURE:
            return cls.DEPARTURE_TRANSITIONS.get(current_state, set())
        elif workflow_type == WorkflowType.TURNAROUND:
            arrival = cls.ARRIVAL_TRANSITIONS.get(current_state, set())
            departure = cls.DEPARTURE_TRANSITIONS.get(current_state, set())
            return arrival.union(departure)
        return set()
    
    @classmethod
    def is_terminal(cls, state: WorkflowState) -> bool:
        """Check if workflow is in a terminal state"""
        return state in cls.TERMINAL_STATES