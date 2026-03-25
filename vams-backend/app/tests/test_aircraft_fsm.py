### File: app/tests/test_aircraft_fsm.py
import pytest

from app.core.fsm.aircraft_fsm import AircraftFSM, AircraftFSMViolation, AircraftState


class TestAircraftFSM:
    def test_valid_registered_to_en_route(self):
        AircraftFSM.validate_transition(
            AircraftState.REGISTERED,
            AircraftState.EN_ROUTE_INBOUND,
        )

    def test_valid_landing_flow_segment(self):
        AircraftFSM.validate_transition(AircraftState.APPROACH, AircraftState.FINAL_APPROACH)
        AircraftFSM.validate_transition(AircraftState.FINAL_APPROACH, AircraftState.LANDING)
        AircraftFSM.validate_transition(AircraftState.LANDING, AircraftState.LANDED)

    def test_invalid_transition_raises(self):
        with pytest.raises(AircraftFSMViolation):
            AircraftFSM.validate_transition(AircraftState.REGISTERED, AircraftState.LANDING)

    def test_emergency_recovery_is_allowed(self):
        assert AircraftFSM.can_transition(AircraftState.APPROACH, AircraftState.EMERGENCY)
        assert AircraftFSM.can_transition(AircraftState.EMERGENCY, AircraftState.PARKED)

    def test_deregistered_is_terminal(self):
        assert AircraftFSM.is_terminal_state(AircraftState.DEREGISTERED)
        assert AircraftFSM.get_allowed_transitions(AircraftState.DEREGISTERED) == set()