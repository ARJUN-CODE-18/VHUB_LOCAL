### File: app/tests/test_aircraft_fsm.py
from app.models.aircraft import AircraftState
from app.services.aircraft_fsm import AircraftFSM

class TestAircraftFSM:
    
    def test_initial_state(self):
        fsm = AircraftFSM()
        assert fsm.state == AircraftState.IDLE
    
    def test_idle_to_approaching(self):
        fsm = AircraftFSM()
        assert fsm.can_trigger("approach")
        fsm.approach()
        assert fsm.state == AircraftState.APPROACHING
    
    def test_approaching_to_holding(self):
        fsm = AircraftFSM(state=AircraftState.APPROACHING)
        assert fsm.can_trigger("hold")
        fsm.hold()
        assert fsm.state == AircraftState.HOLDING
    
    def test_approaching_to_landing(self):
        fsm = AircraftFSM(state=AircraftState.APPROACHING)
        assert fsm.can_trigger("land")
        fsm.land()
        assert fsm.state == AircraftState.LANDING
    
    def test_holding_to_landing(self):
        fsm = AircraftFSM(state=AircraftState.HOLDING)
        assert fsm.can_trigger("land")
        fsm.land()
        assert fsm.state == AircraftState.LANDING
    
    def test_landing_to_landed(self):
        fsm = AircraftFSM(state=AircraftState.LANDING)
        assert fsm.can_trigger("confirm_landed")
        fsm.confirm_landed()
        assert fsm.state == AircraftState.LANDED
    
    def test_landed_to_charging(self):
        fsm = AircraftFSM(state=AircraftState.LANDED)
        assert fsm.can_trigger("start_charging")
        fsm.start_charging()
        assert fsm.state == AircraftState.CHARGING
    
    def test_charging_to_charged(self):
        fsm = AircraftFSM(state=AircraftState.CHARGING)
        assert fsm.can_trigger("complete_charging")
        fsm.complete_charging()
        assert fsm.state == AircraftState.CHARGED
    
    def test_charged_to_departing(self):
        fsm = AircraftFSM(state=AircraftState.CHARGED)
        assert fsm.can_trigger("depart")
        fsm.depart()
        assert fsm.state == AircraftState.DEPARTING
    
    def test_landed_to_departing(self):
        fsm = AircraftFSM(state=AircraftState.LANDED)
        assert fsm.can_trigger("depart")
        fsm.depart()
        assert fsm.state == AircraftState.DEPARTING
    
    def test_departing_to_idle(self):
        fsm = AircraftFSM(state=AircraftState.DEPARTING)
        assert fsm.can_trigger("complete_departure")
        fsm.complete_departure()
        assert fsm.state == AircraftState.IDLE
    
    def test_emergency_from_any_state(self):
        states = [
            AircraftState.IDLE,
            AircraftState.APPROACHING,
            AircraftState.HOLDING,
            AircraftState.LANDING,
            AircraftState.LANDED,
            AircraftState.CHARGING,
            AircraftState.CHARGED,
            AircraftState.DEPARTING
        ]
        for state in states:
            fsm = AircraftFSM(state=state)
            assert fsm.can_trigger("emergency")
            fsm.emergency()
            assert fsm.state == AircraftState.EMERGENCY
    
    def test_emergency_to_idle(self):
        fsm = AircraftFSM(state=AircraftState.EMERGENCY)
        assert fsm.can_trigger("resolve_emergency")
        fsm.resolve_emergency()
        assert fsm.state == AircraftState.IDLE
    
    def test_invalid_transition_idle_to_landing(self):
        fsm = AircraftFSM()
        assert not fsm.can_trigger("land")
    
    def test_invalid_transition_approaching_to_charging(self):
        fsm = AircraftFSM(state=AircraftState.APPROACHING)
        assert not fsm.can_trigger("start_charging")
    
    def test_invalid_transition_charging_to_approaching(self):
        fsm = AircraftFSM(state=AircraftState.CHARGING)
        assert not fsm.can_trigger("approach")
    
    def test_holding_to_approaching_abort(self):
        fsm = AircraftFSM(state=AircraftState.HOLDING)
        assert fsm.can_trigger("abort")
        fsm.abort()
        assert fsm.state == AircraftState.APPROACHING