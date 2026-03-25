"""Priority levels used by queueing and scheduling."""

from enum import Enum


class PriorityLevel(str, Enum):
    NORMAL = "NORMAL"
    EMERGENCY = "EMERGENCY"
    CRITICAL = "CRITICAL"


def priority_rank(priority: PriorityLevel | str) -> int:
    value = priority.value if isinstance(priority, PriorityLevel) else str(priority).upper()
    if value == PriorityLevel.CRITICAL.value:
        return 0
    if value == PriorityLevel.EMERGENCY.value:
        return 1
    return 2
