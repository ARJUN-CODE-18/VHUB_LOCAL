### File: app/tests/test_pad_fsm.py
from app.models.pad import PadState
from app.services.pad_fsm import PadFSM

class TestPadFSM:
    
    def test_initial_state(self):
        fsm = PadFSM()
        assert fsm.state == PadState.AVAILABLE
    
    def test_available_to_reserved(self):
        fsm = PadFSM()
        assert fsm.can_trigger("reserve")
        fsm.reserve()
        assert fsm.state == PadState.RESERVED
    
    def test_reserved_to_occupied(self):
        fsm = PadFSM(state=PadState.RESERVED)
        assert fsm.can_trigger("occupy")
        fsm.occupy()
        assert fsm.state == PadState.OCCUPIED
    
    def test_occupied_to_charging(self):
        fsm = PadFSM(state=PadState.OCCUPIED)
        assert fsm.can_trigger("start_charging")
        fsm.start_charging()
        assert fsm.state == PadState.CHARGING
    
    def test_charging_to_occupied(self):
        fsm = PadFSM(state=PadState.CHARGING)
        assert fsm.can_trigger("stop_charging")
        fsm.stop_charging()
        assert fsm.state == PadState.OCCUPIED
    
    def test_occupied_to_available(self):
        fsm = PadFSM(state=PadState.OCCUPIED)
        assert fsm.can_trigger("release")
        fsm.release()
        assert fsm.state == PadState.AVAILABLE
    
    def test_reserved_to_available_cancel(self):
        fsm = PadFSM(state=PadState.RESERVED)
        assert fsm.can_trigger("cancel")
        fsm.cancel()
        assert fsm.state == PadState.AVAILABLE
    
    def test_any_state_to_maintenance(self):
        states = [
            PadState.AVAILABLE,
            PadState.RESERVED,
            PadState.OCCUPIED,
            PadState.CHARGING
        ]
        for state in states:
            fsm = PadFSM(state=state)
            assert fsm.can_trigger("start_maintenance")
            fsm.start_maintenance()
            assert fsm.state == PadState.MAINTENANCE
    
    def test_maintenance_to_available(self):
        fsm = PadFSM(state=PadState.MAINTENANCE)
        assert fsm.can_trigger("complete_maintenance")
        fsm.complete_maintenance()
        assert fsm.state == PadState.AVAILABLE
    
    def test_any_state_to_offline(self):
        states = [
            PadState.AVAILABLE,
            PadState.RESERVED,
            PadState.OCCUPIED,
            PadState.CHARGING,
            PadState.MAINTENANCE
        ]
        for state in states:
            fsm = PadFSM(state=state)
            assert fsm.can_trigger("take_offline")
            fsm.take_offline()
            assert fsm.state == PadState.OFFLINE
    
    def test_offline_to_available(self):
        fsm = PadFSM(state=PadState.OFFLINE)
        assert fsm.can_trigger("bring_online")
        fsm.bring_online()
        assert fsm.state == PadState.AVAILABLE
    
    def test_invalid_transition_available_to_occupied(self):
        fsm = PadFSM()
        assert not fsm.can_trigger("occupy")
    
    def test_invalid_transition_available_to_charging(self):
        fsm = PadFSM()
        assert not fsm.can_trigger("start_charging")
    
    def test_invalid_transition_reserved_to_charging(self):
        fsm = PadFSM(state=PadState.RESERVED)
        assert not fsm.can_trigger("start_charging")
    
    def test_invalid_transition_charging_to_reserved(self):
        fsm = PadFSM(state=PadState.CHARGING)
        assert not fsm.can_trigger("reserve")
    
    def test_charging_to_available_release(self):
        fsm = PadFSM(state=PadState.CHARGING)
        assert fsm.can_trigger("release")
        fsm.release()
        assert fsm.state == PadState.AVAILABLE