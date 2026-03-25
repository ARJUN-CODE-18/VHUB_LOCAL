### File: app/tests/test_workflow_fsm.py
import pytest

from app.core.fsm.workflow_fsm import (
    WorkflowFSM,
    WorkflowFSMViolation,
    WorkflowState,
    WorkflowType,
)


class TestWorkflowFSM:
    def test_arrival_transition_chain_valid(self):
        WorkflowFSM.validate_transition(WorkflowType.ARRIVAL, WorkflowState.INITIATED, WorkflowState.SLOT_RESERVED)
        WorkflowFSM.validate_transition(WorkflowType.ARRIVAL, WorkflowState.SLOT_RESERVED, WorkflowState.APPROACH_CLEARED)
        WorkflowFSM.validate_transition(WorkflowType.ARRIVAL, WorkflowState.APPROACH_CLEARED, WorkflowState.LANDING_CLEARED)

    def test_departure_transition_chain_valid(self):
        WorkflowFSM.validate_transition(WorkflowType.DEPARTURE, WorkflowState.INITIATED, WorkflowState.SLOT_RESERVED)
        WorkflowFSM.validate_transition(
            WorkflowType.DEPARTURE,
            WorkflowState.SLOT_RESERVED,
            WorkflowState.PRE_DEPARTURE_CHECK,
        )
        WorkflowFSM.validate_transition(
            WorkflowType.DEPARTURE,
            WorkflowState.PRE_DEPARTURE_CHECK,
            WorkflowState.DEPARTURE_CLEARED,
        )

    def test_invalid_transition_raises(self):
        with pytest.raises(WorkflowFSMViolation):
            WorkflowFSM.validate_transition(
                WorkflowType.ARRIVAL,
                WorkflowState.INITIATED,
                WorkflowState.LANDING_CLEARED,
            )

    def test_terminal_states(self):
        assert WorkflowFSM.is_terminal(WorkflowState.COMPLETED)
        assert WorkflowFSM.is_terminal(WorkflowState.CANCELLED)
        assert WorkflowFSM.is_terminal(WorkflowState.EMERGENCY_ABORTED)

    def test_allowed_transitions_non_empty_for_active_state(self):
        allowed = WorkflowFSM.get_allowed_transitions(WorkflowType.ARRIVAL, WorkflowState.SLOT_RESERVED)
        assert WorkflowState.APPROACH_CLEARED in allowed