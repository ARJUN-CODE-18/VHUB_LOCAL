"""
Operations API routes.
Handles scheduling of taxi and landing operations.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, get_current_operator
from app.services.scheduler_service import SchedulerService

router = APIRouter(prefix="/operations", tags=["operations"])


@router.post("/schedule")
def schedule_operation(
    aircraft_id: str,
    operation_type: str,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """
    Schedule taxi or landing operation
    """

    scheduler = SchedulerService(db)

    try:
        result = scheduler.schedule_operation(
            aircraft_id=aircraft_id,
            operation_type=operation_type,
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))