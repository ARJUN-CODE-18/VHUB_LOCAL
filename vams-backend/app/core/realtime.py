"""Realtime websocket broadcasting utilities for VAMS."""

from __future__ import annotations

from typing import Any
import logging

import anyio
from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.core.pad_catalog import STATIC_PAD_IDS
from app.db.models.aircraft import Aircraft
from app.db.models.vertipad import Vertipad
from app.services.pad_queue_service import PadQueueService


logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict[str, Any]):
        disconnected: list[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                disconnected.append(connection)

        for connection in disconnected:
            self.disconnect(connection)


manager = ConnectionManager()


def build_updated_state(db: Session) -> dict[str, Any]:
    pads = (
        db.query(Vertipad)
        .filter(Vertipad.id.in_(STATIC_PAD_IDS))
        .order_by(Vertipad.id.asc())
        .all()
    )
    aircraft = db.query(Aircraft).order_by(Aircraft.updated_at.desc()).all()

    for p in pads:
        print("PAD STATE:", p.id, p.current_aircraft_id)
    for a in aircraft:
        print("AIRCRAFT STATE:", a.id, a.pad_id)

    return {
        "pads": [
            {
                "id": p.id,
                "name": p.name,
                "state": p.state.value,
                "status": getattr(p, "status", None) or p.state.value,
                "current_aircraft_id": p.current_aircraft_id,
                "max_weight_kg": p.max_weight_kg,
                "has_charging": p.has_charging,
                "queue": PadQueueService.get_queue(p.id),
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in pads
        ],
        "aircraft": [
            {
                "id": a.id,
                "tail_number": a.tail_number,
                "state": a.state.value,
                "pad_id": a.pad_id,
                "is_emergency": a.is_emergency,
                "battery_level": a.battery_level,
                "updated_at": a.updated_at.isoformat() if a.updated_at else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in aircraft
        ],
    }


async def broadcast_update_payload(payload: dict[str, Any]) -> None:
    await manager.broadcast(payload)


def _run_broadcast_sync(payload: dict[str, Any]) -> None:
    try:
        anyio.from_thread.run(broadcast_update_payload, payload)
    except RuntimeError:
        logger.debug("No active event loop available for websocket broadcast")


def broadcast_system_update_sync(db: Session) -> None:
    updated_state = build_updated_state(db)
    payload = {
        "type": "UPDATE",
        "data": updated_state,
        "pads": updated_state["pads"],
        "aircraft": updated_state["aircraft"],
    }
    _run_broadcast_sync(payload)


def broadcast_position_entity_updates_sync(db: Session, aircraft_id: str) -> None:
    """Broadcast granular entity updates for aircraft position/pad occupancy changes."""
    updated_state = build_updated_state(db)

    updated_aircraft = next(
        (item for item in updated_state["aircraft"] if item.get("id") == aircraft_id),
        None,
    )

    if updated_aircraft is not None:
        _run_broadcast_sync(
            {
                "type": "AIRCRAFT_UPDATED",
                "data": updated_aircraft,
            }
        )

    for pad in updated_state["pads"]:
        _run_broadcast_sync(
            {
                "type": "PAD_UPDATED",
                "data": pad,
            }
        )
