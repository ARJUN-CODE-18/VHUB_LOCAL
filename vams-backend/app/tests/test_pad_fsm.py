### File: app/tests/test_pad_fsm.py
import pytest

from app.core.fsm.pad_fsm import VertipadFSM, VertipadState


class TestVertipadFSM:
    def test_available_to_reserved_valid(self):
        VertipadFSM.validate_transition(VertipadState.AVAILABLE, VertipadState.RESERVED)

    def test_reserved_to_occupied_valid(self):
        VertipadFSM.validate_transition(VertipadState.RESERVED, VertipadState.OCCUPIED)

    def test_available_to_occupied_valid(self):
        VertipadFSM.validate_transition(VertipadState.AVAILABLE, VertipadState.OCCUPIED)

    def test_emergency_locked_can_recover(self):
        assert VertipadFSM.can_transition(VertipadState.EMERGENCY_LOCKED, VertipadState.AVAILABLE)

    def test_operational_availability_flags(self):
        assert VertipadFSM.is_available_for_operations(VertipadState.AVAILABLE)
        assert VertipadFSM.is_available_for_operations(VertipadState.RESERVED)
        assert not VertipadFSM.is_available_for_operations(VertipadState.OCCUPIED)