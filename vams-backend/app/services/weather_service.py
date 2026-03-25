"""
Weather service layer for meteorological data management.
Validates weather constraints for safe operations.
"""
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import logging
from app.db.models.weather import WeatherReport
from app.db.models.vertipad import Vertipad
from app.db.models.audit import AuditLog
from app.core.events import EventLogger, EventType, EventSeverity
from app.core.config import settings
from app.core.pad_catalog import STATIC_PAD_IDS
from fastapi import HTTPException, status
import math


logger = logging.getLogger(__name__)


class WeatherService:
    """Business logic for weather operations"""
    
    @staticmethod
    def create_weather_report(
        db: Session,
        vertipad_id: str,
        observation_time: datetime,
        wind_speed_mps: float,
        wind_direction_deg: float,
        visibility_m: float,
        temperature_c: float,
        pressure_hpa: float,
        humidity_percent: float,
        precipitation_rate_mmh: float = 0.0,
        precipitation_type: Optional[str] = None,
        wind_gust_mps: Optional[float] = None,
        cloud_ceiling_m: Optional[float] = None,
        cloud_coverage_percent: Optional[float] = None,
        source: str = "manual",
    ) -> WeatherReport:
        """
        Create a new weather report with operational assessment.
        
        Args:
            db: Database session
            vertipad_id: Vertipad identifier
            observation_time: Time of observation
            wind_speed_mps: Wind speed in meters per second
            wind_direction_deg: Wind direction in degrees (0-360)
            visibility_m: Visibility in meters
            temperature_c: Temperature in Celsius
            pressure_hpa: Pressure in hectopascals
            humidity_percent: Relative humidity percentage
            precipitation_rate_mmh: Precipitation rate in mm/hour
            precipitation_type: Type of precipitation (rain, snow, hail)
            wind_gust_mps: Wind gust speed
            cloud_ceiling_m: Cloud ceiling height
            cloud_coverage_percent: Cloud coverage percentage
            source: Data source identifier
            
        Returns:
            Created weather report
        """
        if vertipad_id not in STATIC_PAD_IDS:
            logger.warning("Rejected weather report for unknown pad_id=%s", vertipad_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid pad_id: {vertipad_id}",
            )

        # Validate vertipad exists
        pad = db.query(Vertipad).filter(Vertipad.id == vertipad_id).first()
        if not pad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vertipad {vertipad_id} not found",
            )
        
        # Calculate crosswind component (simplified - assumes runway heading 0)
        crosswind_component_mps = abs(wind_speed_mps * math.sin(math.radians(wind_direction_deg)))
        
        # Assess operational conditions
        is_vfr = WeatherService._assess_vfr(
            visibility_m, cloud_ceiling_m, cloud_coverage_percent
        )
        
        is_operational, constraint_reasons = WeatherService._assess_operational(
            wind_speed_mps, crosswind_component_mps, visibility_m, precipitation_rate_mmh
        )
        
        # Create report
        report = WeatherReport(
            vertipad_id=vertipad_id,
            observation_time=observation_time,
            wind_speed_mps=wind_speed_mps,
            wind_direction_deg=wind_direction_deg,
            wind_gust_mps=wind_gust_mps,
            crosswind_component_mps=crosswind_component_mps,
            visibility_m=visibility_m,
            precipitation_rate_mmh=precipitation_rate_mmh,
            precipitation_type=precipitation_type,
            temperature_c=temperature_c,
            pressure_hpa=pressure_hpa,
            humidity_percent=humidity_percent,
            cloud_ceiling_m=cloud_ceiling_m,
            cloud_coverage_percent=cloud_coverage_percent,
            is_vfr=is_vfr,
            is_operational=is_operational,
            constraint_reasons=constraint_reasons,
            source=source,
        )
        
        db.add(report)
        db.flush()
        
        # Log event if conditions are non-operational
        if not is_operational:
            event = EventLogger.create_event(
                event_type=EventType.WEATHER_CONSTRAINT_VIOLATED,
                severity=EventSeverity.WARNING,
                entity_type="weather",
                entity_id=report.id,
                details={
                    "vertipad_id": vertipad_id,
                    "constraints": constraint_reasons,
                    "wind_speed_mps": wind_speed_mps,
                    "visibility_m": visibility_m,
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
        else:
            event = EventLogger.create_event(
                event_type=EventType.WEATHER_UPDATED,
                severity=EventSeverity.INFO,
                entity_type="weather",
                entity_id=report.id,
                details={
                    "vertipad_id": vertipad_id,
                    "is_operational": is_operational,
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
        db.refresh(report)
        
        return report
    
    @staticmethod
    def get_latest_weather(db: Session, vertipad_id: str) -> Optional[WeatherReport]:
        """Get the most recent weather report for a vertipad"""
        if vertipad_id not in STATIC_PAD_IDS:
            logger.warning("Rejected latest weather query for unknown pad_id=%s", vertipad_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid pad_id: {vertipad_id}",
            )

        return (
            db.query(WeatherReport)
            .filter(WeatherReport.vertipad_id == vertipad_id)
            .order_by(WeatherReport.observation_time.desc())
            .first()
        )
    
    @staticmethod
    def get_weather_report(db: Session, report_id: str) -> WeatherReport:
        """Get weather report by ID"""
        report = db.query(WeatherReport).filter(WeatherReport.id == report_id).first()
        
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Weather report {report_id} not found",
            )
        
        return report
    
    @staticmethod
    def _assess_vfr(
        visibility_m: float,
        cloud_ceiling_m: Optional[float],
        cloud_coverage_percent: Optional[float],
    ) -> bool:
        """
        Assess if conditions meet Visual Flight Rules (VFR).
        Simplified criteria for eVTOL operations.
        """
        # Minimum visibility: 5000m
        if visibility_m < 5000:
            return False
        
        # Cloud ceiling must be at least 300m if present
        if cloud_ceiling_m is not None and cloud_ceiling_m < 300:
            return False
        
        return True
    
    @staticmethod
    def _assess_operational(
        wind_speed_mps: float,
        crosswind_component_mps: float,
        visibility_m: float,
        precipitation_rate_mmh: float,
    ) -> tuple[bool, Optional[str]]:
        """
        Assess if weather conditions permit operations.
        
        Returns:
            Tuple of (is_operational, constraint_reasons)
        """
        constraints = []
        
        # Check wind speed
        if wind_speed_mps > settings.MAX_WIND_SPEED_MPS:
            constraints.append(
                f"Wind speed {wind_speed_mps:.1f} m/s exceeds limit {settings.MAX_WIND_SPEED_MPS} m/s"
            )
        
        # Check crosswind
        if crosswind_component_mps > settings.MAX_CROSSWIND_MPS:
            constraints.append(
                f"Crosswind {crosswind_component_mps:.1f} m/s exceeds limit {settings.MAX_CROSSWIND_MPS} m/s"
            )
        
        # Check visibility
        if visibility_m < settings.MIN_VISIBILITY_METERS:
            constraints.append(
                f"Visibility {visibility_m:.0f} m below minimum {settings.MIN_VISIBILITY_METERS} m"
            )
        
        # Check precipitation (heavy rain/snow)
        if precipitation_rate_mmh > 10.0:
            constraints.append(f"Heavy precipitation {precipitation_rate_mmh:.1f} mm/h")
        
        is_operational = len(constraints) == 0
        constraint_reasons = "; ".join(constraints) if constraints else None
        
        return is_operational, constraint_reasons