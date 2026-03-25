"""
Static vertipad catalog for production-safe pad validation.
Only pads declared here are allowed in the system.
"""

from typing import Dict, Any


STATIC_PAD_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "VP-001": {
        "name": "Vertipad 001",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "elevation_m": 5.0,
        "diameter_m": 30.0,
        "max_weight_kg": 2500.0,
        "charging_power_kw": 50.0,
    },
    "VP-002": {
        "name": "Vertipad 002",
        "latitude": 13.0832,
        "longitude": 80.2715,
        "elevation_m": 5.0,
        "diameter_m": 30.0,
        "max_weight_kg": 2500.0,
        "charging_power_kw": 50.0,
    },
}


STATIC_PAD_IDS = tuple(STATIC_PAD_DEFINITIONS.keys())
