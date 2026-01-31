"""
Energy service layer for charging session management.
Tracks power delivery and battery state of charge.
"""
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.db.models.energy import EnergySession
from app.db.models.aircraft import Aircraft
from app.db.models.vertipad import Vertipad
from app.db.models.audit import AuditLog
from app.core.events import EventLogger, EventType, EventSeverity
from app.core.config import settings
from fastapi import HTTPException, status


class EnergyService:
    """Business logic for energy/charging operations"""
    
    @staticmethod
    def start_charging_session(
        db: Session,
        vertipad_id: str,
        aircraft_id: str,
        initial_battery_percent: float,
    ) -> EnergySession:
        """
        Start a new charging session.
        
        Args:
            db: Database session
            vertipad_id: Vertipad providing power
            aircraft_id: Aircraft being charged
            initial_battery_percent: Starting battery level
            
        Returns:
            Created energy session
        """
        # Validate vertipad
        pad = db.query(Vertipad).filter(Vertipad.id == vertipad_id).first()
        if not pad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vertipad {vertipad_id} not found",
            )
        
        if not pad.has_charging:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vertipad {vertipad_id} does not have charging capability",
            )
        
        # Validate aircraft
        aircraft = db.query(Aircraft).filter(Aircraft.id == aircraft_id).first()
        if not aircraft:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aircraft {aircraft_id} not found",
            )
        
        # Check for active session
        active_session = (
            db.query(EnergySession)
            .filter(
                EnergySession.aircraft_id == aircraft_id,
                EnergySession.is_active,
            )
            .first()
        )
        
        if active_session:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Aircraft {aircraft_id} already has an active charging session",
            )
        
        # Create session
        session = EnergySession(
            vertipad_id=vertipad_id,
            aircraft_id=aircraft_id,
            start_time=datetime.utcnow(),
            initial_battery_percent=initial_battery_percent,
            is_active=True,
        )
        
        db.add(session)
        db.flush()
        
        # Log event
        event = EventLogger.create_event(
            event_type=EventType.CHARGING_STARTED,
            severity=EventSeverity.INFO,
            entity_type="energy_session",
            entity_id=session.id,
            details={
                "vertipad_id": vertipad_id,
                "aircraft_id": aircraft_id,
                "initial_battery_percent": initial_battery_percent,
            },
        )
        
        audit_log = AuditLog(
            event_type=event.event_type,
            severity=event.severity,
            timestamp=event.timestamp,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            details=event.to_json(),
        )
        db.add(audit_log)
        
        db.commit()
        db.refresh(session)
        
        return session
    
    @staticmethod
    def stop_charging_session(
        db: Session,
        session_id: str,
        final_battery_percent: float,
        termination_reason: Optional[str] = None,
    ) -> EnergySession:
        """
        Stop an active charging session.
        
        Args:
            db: Database session
            session_id: Energy session identifier
            final_battery_percent: Ending battery level
            termination_reason: Reason for stopping (optional)
            
        Returns:
            Updated energy session
        """
        session = db.query(EnergySession).filter(EnergySession.id == session_id).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Energy session {session_id} not found",
            )
        
        if not session.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Energy session {session_id} is not active",
            )
        
        # Update session
        session.end_time = datetime.utcnow()
        session.final_battery_percent = final_battery_percent
        session.is_active = False
        session.completed_successfully = termination_reason is None
        session.termination_reason = termination_reason
        
        # Calculate energy delivered (simplified)
        duration_hours = (session.end_time - session.start_time).total_seconds() / 3600
        battery_gain = final_battery_percent - session.initial_battery_percent
        
        # Rough estimate: assume 100 kWh battery capacity for calculation
        assumed_capacity_kwh = 100.0
        session.energy_delivered_kwh = (battery_gain / 100.0) * assumed_capacity_kwh
        
        if duration_hours > 0:
            session.average_power_kw = session.energy_delivered_kwh / duration_hours
            session.peak_power_kw = settings.CHARGING_RATE_KW
        
        # Update aircraft battery level
        aircraft = db.query(Aircraft).filter(Aircraft.id == session.aircraft_id).first()
        if aircraft:
            aircraft.battery_level = final_battery_percent
        
        # Log event
        event = EventLogger.create_event(
            event_type=EventType.CHARGING_STOPPED,
            severity=EventSeverity.INFO,
            entity_type="energy_session",
            entity_id=session.id,
            details={
                "aircraft_id": session.aircraft_id,
                "final_battery_percent": final_battery_percent,
                "energy_delivered_kwh": session.energy_delivered_kwh,
                "duration_hours": duration_hours,
                "termination_reason": termination_reason,
            },
        )
        
        audit_log = AuditLog(
            event_type=event.event_type,
            severity=event.severity,
            timestamp=event.timestamp,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            details=event.to_json(),
        )
        db.add(audit_log)
        
        db.commit()
        db.refresh(session)
        
        return session
    
    @staticmethod
    def get_active_session(db: Session, aircraft_id: str) -> Optional[EnergySession]:
        """Get active charging session for aircraft"""
        return (
            db.query(EnergySession)
            .filter(
                EnergySession.aircraft_id == aircraft_id,
                EnergySession.is_active,
            )
            .first()
        )
    
    @staticmethod
    def check_battery_sufficient_for_departure(
        db: Session,
        aircraft_id: str,
    ) -> tuple[bool, float]:
        """
        Check if aircraft battery is sufficient for departure.
        
        Returns:
            Tuple of (is_sufficient, battery_level)
        """
        aircraft = db.query(Aircraft).filter(Aircraft.id == aircraft_id).first()
        
        if not aircraft or aircraft.battery_level is None:
            return False, 0.0
        
        is_sufficient = aircraft.battery_level >= settings.MIN_BATTERY_DEPARTURE_PERCENT
        
        return is_sufficient, aircraft.battery_level