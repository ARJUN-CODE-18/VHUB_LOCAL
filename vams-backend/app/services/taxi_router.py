"""
Taxi routing service for simple vertiport ground movement pathfinding.
"""
from collections import deque
from typing import Dict, List


GRAPH: Dict[str, List[str]] = {
    "PAD-1": ["TAXIWAY"],
    "PAD-2": ["TAXIWAY"],
    "TAXIWAY": ["PAD-1", "PAD-2", "CHARGING"],
    "CHARGING": ["TAXIWAY"],
}


def find_taxi_route(start: str, destination: str):
    """
    Find the shortest taxi route between two nodes using BFS.

    Returns:
        A list of node names representing the route from start to destination.

    Raises:
        Exception: If start/destination is invalid or no route exists.
    """
    if start not in GRAPH:
        raise Exception(f"Unknown start node: {start}")
    if destination not in GRAPH:
        raise Exception(f"Unknown destination node: {destination}")

    queue = deque([(start, [start])])
    visited = {start}

    while queue:
        current, path = queue.popleft()

        if current == destination:
            return path

        for neighbor in GRAPH.get(current, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))

    raise Exception("No route exists between the specified nodes")
