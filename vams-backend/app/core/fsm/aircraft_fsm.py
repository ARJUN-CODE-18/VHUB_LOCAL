"""
Aircraft Finite State Machine
Defines all valid states and transitions for aircraft lifecycle management.
Safety-critical: Every transition must be explicitly validated.
"""

from enum import Enum
from typing import Set


class AircraftState(str, Enum):
    """All valid aircraft states per VAMS specification"""
    REGISTERED = "REGISTERED"
    EN_ROUTE_INBOUND = "EN_ROUTE_INBOUND"
    APPROACH = "APPROACH"
    FINAL_APPROACH = "FINAL_APPROACH"
    LANDING = "LANDING"
    LANDED = "LANDED"
    TAXIING = "TAXIING"
    PARKED = "PARKED"
    CHARGING = "CHARGING"
    MAINTENANCE = "MAINTENANCE"
    PRE_DEPARTURE = "PRE_DEPARTURE"
    TAKEOFF_READY = "TAKEOFF_READY"
    DEPARTING = "DEPARTING"
    DEPARTED = "DEPARTED"
    EMERGENCY = "EMERGENCY"
    DEREGISTERED = "DEREGISTERED"


class AircraftFSMViolation(Exception):
    """Raised when an invalid state transition is attempted"""
    pass


class AircraftFSM:
    """
    Aircraft Finite State Machine with strict transition validation.
    This is the ONLY FSM used by the system.
    """

    TRANSITIONS = {
        AircraftState.REGISTERED: {
            AircraftState.EN_ROUTE_INBOUND,
            AircraftState.EMERGENCY,
            AircraftState.DEREGISTERED,
        },
        AircraftState.EN_ROUTE_INBOUND: {
            AircraftState.APPROACH,
            AircraftState.EMERGENCY,
        },
        AircraftState.APPROACH: {
            AircraftState.FINAL_APPROACH,
            AircraftState.EN_ROUTE_INBOUND,
            AircraftState.EMERGENCY,
        },
        AircraftState.FINAL_APPROACH: {
            AircraftState.LANDING,
            AircraftState.APPROACH,
            AircraftState.EMERGENCY,
        },
        AircraftState.LANDING: {
            AircraftState.LANDED,
            AircraftState.EMERGENCY,
        },
        AircraftState.LANDED: {
            AircraftState.TAXIING,
            AircraftState.PARKED,
            AircraftState.EMERGENCY,
        },
        AircraftState.TAXIING: {
            AircraftState.PARKED,
            AircraftState.EMERGENCY,
        },
        AircraftState.PARKED: {
            AircraftState.CHARGING,
            AircraftState.MAINTENANCE,
            AircraftState.PRE_DEPARTURE,
            AircraftState.EMERGENCY,
        },
        AircraftState.CHARGING: {
            AircraftState.PARKED,
            AircraftState.PRE_DEPARTURE,
            AircraftState.EMERGENCY,
        },
        AircraftState.MAINTENANCE: {
            AircraftState.PARKED,
            AircraftState.EMERGENCY,
        },
        AircraftState.PRE_DEPARTURE: {
            AircraftState.TAKEOFF_READY,
            AircraftState.PARKED,
            AircraftState.EMERGENCY,
        },
        AircraftState.TAKEOFF_READY: {
            AircraftState.DEPARTING,
            AircraftState.PARKED,
            AircraftState.EMERGENCY,
        },
        AircraftState.DEPARTING: {
            AircraftState.DEPARTED,
            AircraftState.EMERGENCY,
        },
        AircraftState.DEPARTED: {
            AircraftState.DEREGISTERED,
        },
        AircraftState.EMERGENCY: {
            AircraftState.LANDED,
            AircraftState.PARKED,
            AircraftState.MAINTENANCE,
            AircraftState.DEREGISTERED,
        },
        AircraftState.DEREGISTERED: set(),
    }

    @classmethod
    def validate_transition(
        cls,
        current_state: AircraftState,
        target_state: AircraftState,
    ) -> None:
        if current_state not in cls.TRANSITIONS:
            raise AircraftFSMViolation(f"Unknown state: {current_state}")

        if target_state not in cls.TRANSITIONS[current_state]:
            raise AircraftFSMViolation(
                f"Invalid transition {current_state} → {target_state}. "
                f"Allowed: {cls.TRANSITIONS[current_state]}"
            )

    @classmethod
    def can_transition(
        cls,
        current_state: AircraftState,
        target_state: AircraftState,
    ) -> bool:
        try:
            cls.validate_transition(current_state, target_state)
            return True
        except AircraftFSMViolation:
            return False

    @classmethod
    def get_allowed_transitions(
        cls, state: AircraftState
    ) -> Set[AircraftState]:
        return cls.TRANSITIONS.get(state, set())

    @classmethod
    def is_terminal_state(cls, state: AircraftState) -> bool:
        return not cls.TRANSITIONS.get(state)
