"""In-memory per-pad queue manager."""

from __future__ import annotations

import time
from typing import TypedDict

from app.core.pad_catalog import STATIC_PAD_IDS
from app.core.priority import PriorityLevel, priority_rank


class QueueEntry(TypedDict):
    aircraft_id: str
    priority: str
    timestamp: float


pad_queues: dict[str, list[QueueEntry]] = {pad_id: [] for pad_id in STATIC_PAD_IDS}


class PadQueueService:
    @staticmethod
    def _sort_queue(queue: list[QueueEntry]) -> None:
        queue.sort(
            key=lambda item: (
                priority_rank(item["priority"]),
                item["timestamp"],
            )
        )

    @staticmethod
    def add_to_queue(
        pad_id: str,
        aircraft_id: str,
        priority: PriorityLevel = PriorityLevel.NORMAL,
    ) -> int:
        queue = pad_queues.setdefault(pad_id, [])
        for item in queue:
            if item["aircraft_id"] == aircraft_id:
                if priority_rank(priority) < priority_rank(item["priority"]):
                    item["priority"] = priority.value
                    item["timestamp"] = time.time()
                    PadQueueService._sort_queue(queue)
                return next(i for i, entry in enumerate(queue, start=1) if entry["aircraft_id"] == aircraft_id)

        entry: QueueEntry = {
            "aircraft_id": aircraft_id,
            "priority": priority.value,
            "timestamp": time.time(),
        }
        queue.append(entry)
        PadQueueService._sort_queue(queue)
        return next(i for i, item in enumerate(queue, start=1) if item["aircraft_id"] == aircraft_id)

    @staticmethod
    def pop_next_aircraft(pad_id: str) -> QueueEntry | None:
        queue = pad_queues.setdefault(pad_id, [])
        return queue.pop(0) if queue else None

    @staticmethod
    def get_queue(pad_id: str) -> list[QueueEntry]:
        return list(pad_queues.setdefault(pad_id, []))

    @staticmethod
    def get_all_queues() -> dict[str, list[QueueEntry]]:
        return {pad_id: list(queue) for pad_id, queue in pad_queues.items()}

    @staticmethod
    def remove_aircraft(aircraft_id: str) -> None:
        for queue in pad_queues.values():
            for idx, item in enumerate(queue):
                if item["aircraft_id"] == aircraft_id:
                    queue.pop(idx)
                    break
