"""
Simple Pad FSM used by tests. Wraps PadState from `app.models.pad`.
"""
from app.models.pad import PadState


class PadFSMViolation(Exception):
    pass


class PadFSM:
    TRANSITIONS = {
        PadState.AVAILABLE: {PadState.RESERVED, PadState.MAINTENANCE, PadState.OFFLINE},
        PadState.RESERVED: {PadState.OCCUPIED, PadState.AVAILABLE, PadState.MAINTENANCE, PadState.OFFLINE},
        PadState.OCCUPIED: {PadState.CHARGING, PadState.AVAILABLE, PadState.MAINTENANCE, PadState.OFFLINE},
        PadState.CHARGING: {PadState.OCCUPIED, PadState.AVAILABLE, PadState.MAINTENANCE, PadState.OFFLINE},
        PadState.MAINTENANCE: {PadState.AVAILABLE, PadState.OFFLINE},
        PadState.OFFLINE: {PadState.AVAILABLE},
    }

    def __init__(self, state: PadState = PadState.AVAILABLE):
        self.state = state

    @classmethod
    def can_transition(cls, current: PadState, target: PadState) -> bool:
        return target in cls.TRANSITIONS.get(current, set())

    def can_trigger(self, trigger: str) -> bool:
        try:
            target = self._trigger_to_state(trigger)
        except KeyError:
            return False
        return self.can_transition(self.state, target)

    def _trigger_to_state(self, trigger: str) -> PadState:
        mapping = {
            "reserve": PadState.RESERVED,
            "occupy": PadState.OCCUPIED,
            "start_charging": PadState.CHARGING,
            "stop_charging": PadState.OCCUPIED,
            "release": PadState.AVAILABLE,
            "cancel": PadState.AVAILABLE,
            "start_maintenance": PadState.MAINTENANCE,
            "complete_maintenance": PadState.AVAILABLE,
            "take_offline": PadState.OFFLINE,
            "bring_online": PadState.AVAILABLE,
        }
        return mapping[trigger]

    def _apply_trigger(self, trigger: str) -> None:
        target = self._trigger_to_state(trigger)
        if not self.can_transition(self.state, target):
            raise PadFSMViolation(f"Invalid transition from {self.state} via {trigger}")
        self.state = target

    # Expose triggers
    def reserve(self):
        self._apply_trigger("reserve")

    def occupy(self):
        self._apply_trigger("occupy")

    def start_charging(self):
        self._apply_trigger("start_charging")

    def stop_charging(self):
        self._apply_trigger("stop_charging")

    def release(self):
        self._apply_trigger("release")

    def cancel(self):
        self._apply_trigger("cancel")

    def start_maintenance(self):
        self._apply_trigger("start_maintenance")

    def complete_maintenance(self):
        self._apply_trigger("complete_maintenance")

    def take_offline(self):
        self._apply_trigger("take_offline")

    def bring_online(self):
        self._apply_trigger("bring_online")
