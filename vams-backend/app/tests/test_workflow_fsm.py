### File: app/tests/test_workflow_fsm.py
from app.models.workflow import WorkflowState
from app.services.workflow_fsm import WorkflowFSM

class TestWorkflowFSM:
    
    def test_initial_state(self):
        fsm = WorkflowFSM()
        assert fsm.state == WorkflowState.PENDING
    
    def test_pending_to_scheduled(self):
        fsm = WorkflowFSM()
        assert fsm.can_trigger("schedule")
        fsm.schedule()
        assert fsm.state == WorkflowState.SCHEDULED
    
    def test_scheduled_to_active(self):
        fsm = WorkflowFSM(state=WorkflowState.SCHEDULED)
        assert fsm.can_trigger("activate")
        fsm.activate()
        assert fsm.state == WorkflowState.ACTIVE
    
    def test_active_to_approaching(self):
        fsm = WorkflowFSM(state=WorkflowState.ACTIVE)
        assert fsm.can_trigger("aircraft_approach")
        fsm.aircraft_approach()
        assert fsm.state == WorkflowState.APPROACHING
    
    def test_approaching_to_landing(self):
        fsm = WorkflowFSM(state=WorkflowState.APPROACHING)
        assert fsm.can_trigger("aircraft_land")
        fsm.aircraft_land()
        assert fsm.state == WorkflowState.LANDING
    
    def test_landing_to_servicing(self):
        fsm = WorkflowFSM(state=WorkflowState.LANDING)
        assert fsm.can_trigger("start_service")
        fsm.start_service()
        assert fsm.state == WorkflowState.SERVICING
    
    def test_servicing_to_charging(self):
        fsm = WorkflowFSM(state=WorkflowState.SERVICING)
        assert fsm.can_trigger("start_charging")
        fsm.start_charging()
        assert fsm.state == WorkflowState.CHARGING
    
    def test_charging_to_ready(self):
        fsm = WorkflowFSM(state=WorkflowState.CHARGING)
        assert fsm.can_trigger("complete_charging")
        fsm.complete_charging()
        assert fsm.state == WorkflowState.READY
    
    def test_servicing_to_ready_skip_charging(self):
        fsm = WorkflowFSM(state=WorkflowState.SERVICING)
        assert fsm.can_trigger("complete_service")
        fsm.complete_service()
        assert fsm.state == WorkflowState.READY
    
    def test_ready_to_departing(self):
        fsm = WorkflowFSM(state=WorkflowState.READY)
        assert fsm.can_trigger("initiate_departure")
        fsm.initiate_departure()
        assert fsm.state == WorkflowState.DEPARTING
    
    def test_departing_to_completed(self):
        fsm = WorkflowFSM(state=WorkflowState.DEPARTING)
        assert fsm.can_trigger("complete_departure")
        fsm.complete_departure()
        assert fsm.state == WorkflowState.COMPLETED
    
    def test_pending_to_cancelled(self):
        fsm = WorkflowFSM(state=WorkflowState.PENDING)
        assert fsm.can_trigger("cancel")
        fsm.cancel()
        assert fsm.state == WorkflowState.CANCELLED
    
    def test_scheduled_to_cancelled(self):
        fsm = WorkflowFSM(state=WorkflowState.SCHEDULED)
        assert fsm.can_trigger("cancel")
        fsm.cancel()
        assert fsm.state == WorkflowState.CANCELLED
    
    def test_active_to_cancelled(self):
        fsm = WorkflowFSM(state=WorkflowState.ACTIVE)
        assert fsm.can_trigger("cancel")
        fsm.cancel()
        assert fsm.state == WorkflowState.CANCELLED
    
    def test_any_operational_state_to_failed(self):
        states = [
            WorkflowState.ACTIVE,
            WorkflowState.APPROACHING,
            WorkflowState.LANDING,
            WorkflowState.SERVICING,
            WorkflowState.CHARGING,
            WorkflowState.READY,
            WorkflowState.DEPARTING
        ]
        for state in states:
            fsm = WorkflowFSM(state=state)
            assert fsm.can_trigger("fail")
            fsm.fail()
            assert fsm.state == WorkflowState.FAILED
    
    def test_failed_to_pending_retry(self):
        fsm = WorkflowFSM(state=WorkflowState.FAILED)
        assert fsm.can_trigger("retry")
        fsm.retry()
        assert fsm.state == WorkflowState.PENDING
    
    def test_invalid_transition_pending_to_approaching(self):
        fsm = WorkflowFSM()
        assert not fsm.can_trigger("aircraft_approach")
    
    def test_invalid_transition_completed_to_active(self):
        fsm = WorkflowFSM(state=WorkflowState.COMPLETED)
        assert not fsm.can_trigger("activate")
    
    def test_invalid_transition_cancelled_to_scheduled(self):
        fsm = WorkflowFSM(state=WorkflowState.CANCELLED)
        assert not fsm.can_trigger("schedule")
    
    def test_invalid_transition_charging_to_departing(self):
        fsm = WorkflowFSM(state=WorkflowState.CHARGING)
        assert not fsm.can_trigger("initiate_departure")
    
    def test_approaching_to_active_abort(self):
        fsm = WorkflowFSM(state=WorkflowState.APPROACHING)
        assert fsm.can_trigger("abort")
        fsm.abort()
        assert fsm.state == WorkflowState.ACTIVE
    
    def test_landing_to_approaching_abort(self):
        fsm = WorkflowFSM(state=WorkflowState.LANDING)
        assert fsm.can_trigger("abort")
        fsm.abort()
        assert fsm.state == WorkflowState.APPROACHING