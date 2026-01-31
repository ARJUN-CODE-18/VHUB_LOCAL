"""
Compatibility shim for legacy imports.

Historically the package exposed vertipad_fsm; it was refactored to `pad_fsm`.
This module re-exports the original names so existing imports remain valid.
"""
from .pad_fsm import VertipadState, VertipadFSM, VertipadFSMViolation

__all__ = ["VertipadState", "VertipadFSM", "VertipadFSMViolation"]
