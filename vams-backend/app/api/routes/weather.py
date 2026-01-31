"""
Weather API routes.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from app.api.deps import get_db_session, get_current_operator
from app.schemas.weather import WeatherReportCreate, WeatherReportResponse
from app.services.weather_service import WeatherService


router = APIRouter(prefix="/weather", tags=["weather"])


@router.post("/", response_model=WeatherReportResponse, status_code=201)
def create_weather_report(
    data: WeatherReportCreate,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Create a new weather report"""
    report = WeatherService.create_weather_report(
        db=db,
        vertipad_id=data.vertipad_id,
        observation_time=data.observation_time,
        wind_speed_mps=data.wind_speed_mps,
        wind_direction_deg=data.wind_direction_deg,
        visibility_m=data.visibility_m,
        temperature_c=data.temperature_c,
        pressure_hpa=data.pressure_hpa,
        humidity_percent=data.humidity_percent,
        precipitation_rate_mmh=data.precipitation_rate_mmh,
        precipitation_type=data.precipitation_type,
        wind_gust_mps=data.wind_gust_mps,
        cloud_ceiling_m=data.cloud_ceiling_m,
        cloud_coverage_percent=data.cloud_coverage_percent,
        source=data.source,
    )
    return report


@router.get("/{report_id}", response_model=WeatherReportResponse)
def get_weather_report(
    report_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Get weather report by ID"""
    report = WeatherService.get_weather_report(db, report_id)
    return report


@router.get("/latest/{vertipad_id}", response_model=Optional[WeatherReportResponse])
def get_latest_weather(
    vertipad_id: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """Get latest weather report for vertipad"""
    report = WeatherService.get_latest_weather(db, vertipad_id)
    return report