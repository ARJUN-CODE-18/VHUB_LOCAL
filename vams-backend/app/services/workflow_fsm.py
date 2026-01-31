"""
Test-focused workflow FSM implementation used by tests.
"""
from app.models.workflow import WorkflowState


class WorkflowFSMViolation(Exception):
    pass


class WorkflowFSM:
    TRANSITIONS = {
        WorkflowState.PENDING: {WorkflowState.SCHEDULED, WorkflowState.CANCELLED, WorkflowState.FAILED},
        WorkflowState.SCHEDULED: {WorkflowState.ACTIVE, WorkflowState.CANCELLED, WorkflowState.FAILED},
        WorkflowState.ACTIVE: {WorkflowState.APPROACHING, WorkflowState.CANCELLED, WorkflowState.FAILED},
        WorkflowState.APPROACHING: {WorkflowState.LANDING, WorkflowState.ACTIVE, WorkflowState.FAILED},
        WorkflowState.LANDING: {WorkflowState.SERVICING, WorkflowState.APPROACHING, WorkflowState.FAILED},
        WorkflowState.SERVICING: {WorkflowState.CHARGING, WorkflowState.READY, WorkflowState.FAILED},
        WorkflowState.CHARGING: {WorkflowState.READY, WorkflowState.FAILED},
        WorkflowState.READY: {WorkflowState.DEPARTING, WorkflowState.FAILED},
        WorkflowState.DEPARTING: {WorkflowState.COMPLETED, WorkflowState.FAILED},
        WorkflowState.FAILED: {WorkflowState.PENDING},
        WorkflowState.CANCELLED: set(),
        WorkflowState.COMPLETED: set(),
    }

    def __init__(self, state: WorkflowState = WorkflowState.PENDING):
        self.state = state

    @classmethod
    def can_transition(cls, current: WorkflowState, target: WorkflowState) -> bool:
        return target in cls.TRANSITIONS.get(current, set())

    def can_trigger(self, trigger: str) -> bool:
        # abort is context-sensitive
        if trigger == "abort":
            return self.state in {WorkflowState.APPROACHING, WorkflowState.LANDING}
        try:
            target = self._trigger_to_state(trigger)
        except KeyError:
            return False
        return self.can_transition(self.state, target)

    def _trigger_to_state(self, trigger: str) -> WorkflowState:
        mapping = {
            "schedule": WorkflowState.SCHEDULED,
            "activate": WorkflowState.ACTIVE,
            "aircraft_approach": WorkflowState.APPROACHING,
            "aircraft_land": WorkflowState.LANDING,
            "start_service": WorkflowState.SERVICING,
            "start_charging": WorkflowState.CHARGING,
            "complete_charging": WorkflowState.READY,
            "complete_service": WorkflowState.READY,
            "initiate_departure": WorkflowState.DEPARTING,
            "complete_departure": WorkflowState.COMPLETED,
            "cancel": WorkflowState.CANCELLED,
            "fail": WorkflowState.FAILED,
            "retry": WorkflowState.PENDING,
            # abort is context-sensitive and handled separately
        }
        return mapping[trigger]

    def _apply_trigger(self, trigger: str) -> None:
        target = self._trigger_to_state(trigger)
        if not self.can_transition(self.state, target):
            raise WorkflowFSMViolation(f"Invalid transition from {self.state} via {trigger}")
        self.state = target

    # Expose triggers used by tests
    def schedule(self):
        self._apply_trigger("schedule")

    def activate(self):
        self._apply_trigger("activate")

    def aircraft_approach(self):
        self._apply_trigger("aircraft_approach")

    def aircraft_land(self):
        self._apply_trigger("aircraft_land")

    def start_service(self):
        self._apply_trigger("start_service")

    def start_charging(self):
        self._apply_trigger("start_charging")

    def complete_charging(self):
        self._apply_trigger("complete_charging")

    def complete_service(self):
        self._apply_trigger("complete_service")

    def initiate_departure(self):
        self._apply_trigger("initiate_departure")

    def complete_departure(self):
        self._apply_trigger("complete_departure")

    def cancel(self):
        self._apply_trigger("cancel")

    def fail(self):
        self._apply_trigger("fail")

    def retry(self):
        self._apply_trigger("retry")

    def abort(self):
        # Abort is context sensitive: approaching -> active, landing -> approaching
        if self.state == WorkflowState.APPROACHING:
            self.state = WorkflowState.ACTIVE
            return
        if self.state == WorkflowState.LANDING:
            self.state = WorkflowState.APPROACHING
            return
        raise WorkflowFSMViolation("Abort not allowed from current state")
