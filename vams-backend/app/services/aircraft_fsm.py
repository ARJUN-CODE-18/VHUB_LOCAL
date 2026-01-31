# Expose the main FSM class directly for backward compatibility
from app.core.fsm.aircraft_fsm import AircraftFSM, AircraftFSMViolation

__all__ = ["AircraftFSM", "AircraftFSMViolation"]
