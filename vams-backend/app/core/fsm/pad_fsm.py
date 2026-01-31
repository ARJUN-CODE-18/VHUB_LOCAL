"""
Vertipad Finite State Machine
Defines all valid states and transitions for vertipad operational status.
Safety-critical: Pad state controls aircraft operations.
"""
from enum import Enum
from typing import Set


class VertipadState(str, Enum):
    """All valid vertipad states per VAMS specification"""
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    OCCUPIED = "OCCUPIED"
    CHARGING_ACTIVE = "CHARGING_ACTIVE"
    MAINTENANCE = "MAINTENANCE"
    EMERGENCY_LOCKED = "EMERGENCY_LOCKED"
    OFFLINE = "OFFLINE"


class VertipadFSMViolation(Exception):
    """Raised when an invalid pad state transition is attempted"""
    pass


class VertipadFSM:
    """
    Vertipad Finite State Machine with strict transition validation.
    Ensures pad availability logic is deterministic.
    """
    
    TRANSITIONS = {
        VertipadState.AVAILABLE: {
            VertipadState.RESERVED,
            VertipadState.MAINTENANCE,
            VertipadState.EMERGENCY_LOCKED,
            VertipadState.OFFLINE,
        },
        VertipadState.RESERVED: {
            VertipadState.OCCUPIED,
            VertipadState.AVAILABLE,  # Slot cancelled
            VertipadState.EMERGENCY_LOCKED,
        },
        VertipadState.OCCUPIED: {
            VertipadState.CHARGING_ACTIVE,
            VertipadState.AVAILABLE,  # Aircraft departed
            VertipadState.MAINTENANCE,
            VertipadState.EMERGENCY_LOCKED,
        },
        VertipadState.CHARGING_ACTIVE: {
            VertipadState.OCCUPIED,
            VertipadState.AVAILABLE,
            VertipadState.EMERGENCY_LOCKED,
        },
        VertipadState.MAINTENANCE: {
            VertipadState.AVAILABLE,
            VertipadState.EMERGENCY_LOCKED,
        },
        VertipadState.EMERGENCY_LOCKED: {
            VertipadState.AVAILABLE,
            VertipadState.MAINTENANCE,
            VertipadState.OFFLINE,
        },
        VertipadState.OFFLINE: {
            VertipadState.MAINTENANCE,
            VertipadState.AVAILABLE,
        },
    }
    
    @classmethod
    def validate_transition(
        cls,
        current_state: VertipadState,
        target_state: VertipadState,
    ) -> None:
        """
        Validate if transition from current_state to target_state is allowed.
        
        Args:
            current_state: Current pad state
            target_state: Desired target state
            
        Raises:
            VertipadFSMViolation: If transition is not permitted
        """
        if current_state not in cls.TRANSITIONS:
            raise VertipadFSMViolation(
                f"Unknown current state: {current_state}"
            )
        
        allowed_transitions = cls.TRANSITIONS[current_state]
        
        if target_state not in allowed_transitions:
            raise VertipadFSMViolation(
                f"Invalid pad transition from {current_state} to {target_state}. "
                f"Allowed transitions: {allowed_transitions}"
            )
    
    @classmethod
    def can_transition(
        cls,
        current_state: VertipadState,
        target_state: VertipadState,
    ) -> bool:
        """Check if transition is valid without raising exception"""
        try:
            cls.validate_transition(current_state, target_state)
            return True
        except VertipadFSMViolation:
            return False
    
    @classmethod
    def get_allowed_transitions(cls, current_state: VertipadState) -> Set[VertipadState]:
        """Get all allowed transitions from current state"""
        return cls.TRANSITIONS.get(current_state, set())
    
    @classmethod
    def is_available_for_operations(cls, state: VertipadState) -> bool:
        """Check if pad can accept aircraft operations"""
        operational_states = {
            VertipadState.AVAILABLE,
            VertipadState.RESERVED,
        }
        return state in operational_states
    
    @classmethod
    def requires_clearance(cls, state: VertipadState) -> bool:
        """Check if pad state requires special clearance to change"""
        restricted_states = {
            VertipadState.EMERGENCY_LOCKED,
            VertipadState.MAINTENANCE,
        }
        return state in restricted_states