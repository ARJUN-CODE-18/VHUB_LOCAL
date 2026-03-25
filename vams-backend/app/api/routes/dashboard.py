"""
Dashboard API routes.
Provides aggregated operational status for monitoring.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.api.deps import get_db_session, get_current_operator
from app.db.models.aircraft import Aircraft
from app.db.models.vertipad import Vertipad
from app.db.models.slot import Slot, SlotStatus
from app.db.models.workflow import Workflow
from app.db.models.weather import WeatherReport
from app.core.fsm.vertipad_fsm import VertipadState
from app.core.fsm.workflow_fsm import WorkflowState
from app.core.pad_catalog import STATIC_PAD_IDS


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/status")
def get_system_status(
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Get overall system status"""
    
    # Aircraft counts by state
    aircraft_counts = (
        db.query(Aircraft.state, func.count(Aircraft.id))
        .group_by(Aircraft.state)
        .all()
    )
    aircraft_by_state = {state: count for state, count in aircraft_counts}
    
    # Vertipad status
    pads = db.query(Vertipad).filter(Vertipad.id.in_(STATIC_PAD_IDS)).all()
    pad_status = [
        {
            "id": p.id,
            "name": p.name,
            "state": p.state,
            "is_operational": p.is_operational,
            "current_aircraft_id": p.current_aircraft_id,
        }
        for p in pads
    ]
    occupied_pads = sum(1 for p in pads if p.current_aircraft_id is not None)
    available_pads = max(len(pads) - occupied_pads, 0)
    
    # Active workflows
    active_workflows = db.query(Workflow).filter(
        Workflow.state.notin_([
            WorkflowState.COMPLETED,
            WorkflowState.CANCELLED,
            WorkflowState.EMERGENCY_ABORTED,
        ])
    ).count()
    
    # Emergency status
    emergency_aircraft = db.query(Aircraft).filter(
        Aircraft.is_emergency
    ).count()
    
    locked_pads = db.query(Vertipad).filter(
        Vertipad.id.in_(STATIC_PAD_IDS),
        Vertipad.state == VertipadState.EMERGENCY_LOCKED
    ).count()
    
    # Upcoming slots (next 4 hours)
    now = datetime.utcnow()
    upcoming_slots = db.query(Slot).filter(
        Slot.vertipad_id.in_(STATIC_PAD_IDS),
        Slot.start_time >= now,
        Slot.start_time <= now + timedelta(hours=4),
        Slot.status.in_([SlotStatus.CONFIRMED, SlotStatus.REQUESTED]),
    ).order_by(Slot.start_time).limit(10).all()
    
    # Latest weather
    latest_weather = (
        db.query(WeatherReport)
        .order_by(WeatherReport.observation_time.desc())
        .first()
    )
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "aircraft": {
            "total": sum(aircraft_by_state.values()),
            "by_state": aircraft_by_state,
            "emergency_count": emergency_aircraft,
        },
        "vertipads": {
            "total": len(pads),
            "occupied": occupied_pads,
            "available": available_pads,
            "status": pad_status,
            "locked_count": locked_pads,
        },
        "workflows": {
            "active_count": active_workflows,
        },
        "slots": {
            "upcoming_count": len(upcoming_slots),
            "upcoming": [
                {
                    "id": s.id,
                    "type": s.slot_type,
                    "start_time": s.start_time.isoformat(),
                    "aircraft_id": s.aircraft_id,
                    "status": s.status,
                }
                for s in upcoming_slots
            ],
        },
        "weather": {
            "latest_observation": latest_weather.observation_time.isoformat() if latest_weather else None,
            "is_operational": latest_weather.is_operational if latest_weather else None,
            "wind_speed_mps": latest_weather.wind_speed_mps if latest_weather else None,
            "visibility_m": latest_weather.visibility_m if latest_weather else None,
        } if latest_weather else None,
        "emergency_status": {
            "aircraft_emergencies": emergency_aircraft,
            "locked_pads": locked_pads,
            "system_nominal": emergency_aircraft == 0 and locked_pads == 0,
        },
    }


@router.get("/aircraft-summary")
def get_aircraft_summary(
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Get detailed aircraft summary"""
    aircraft = db.query(Aircraft).all()
    
    return {
        "total": len(aircraft),
        "aircraft": [
            {
                "id": a.id,
                "tail_number": a.tail_number,
                "state": a.state,
                "battery_level": a.battery_level,
                "is_emergency": a.is_emergency,
                "operator": a.operator,
            }
            for a in aircraft
        ],
    }


@router.get("/operations-today")
def get_operations_today(
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Get operations summary for today"""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Completed workflows today
    completed_workflows = db.query(Workflow).filter(
        Workflow.completed_at >= today_start,
        Workflow.state == WorkflowState.COMPLETED,
    ).all()
    
    # Aborted workflows today
    aborted_workflows = db.query(Workflow).filter(
        Workflow.completed_at >= today_start,
        Workflow.state == WorkflowState.EMERGENCY_ABORTED,
    ).count()
    
    # Slots today
    slots_today = db.query(Slot).filter(
        Slot.start_time >= today_start,
    ).all()
    
    return {
        "date": today_start.date().isoformat(),
        "workflows": {
            "completed": len(completed_workflows),
            "aborted": aborted_workflows,
            "arrivals": sum(1 for w in completed_workflows if w.workflow_type.value == "ARRIVAL"),
            "departures": sum(1 for w in completed_workflows if w.workflow_type.value == "DEPARTURE"),
        },
        "slots": {
            "total": len(slots_today),
            "completed": sum(1 for s in slots_today if s.status == SlotStatus.COMPLETED),
            "active": sum(1 for s in slots_today if s.status == SlotStatus.ACTIVE),
            "confirmed": sum(1 for s in slots_today if s.status == SlotStatus.CONFIRMED),
            "cancelled": sum(1 for s in slots_today if s.status == SlotStatus.CANCELLED),
        },
    }