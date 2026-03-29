"""
Operations API routes.
Handles scheduling of taxi and landing operations.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db_session, get_current_operator
from app.schemas.operations import OperationScheduleRequest, OperationScheduleResponse
from app.core.realtime import broadcast_system_update_sync
from app.services.scheduler_service import SchedulerService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/operations", tags=["operations"])


@router.post("/schedule", response_model=OperationScheduleResponse, status_code=201)
def schedule_operation(
    payload: OperationScheduleRequest,
    db: Session = Depends(get_db_session),
    operator: str = Depends(get_current_operator),
):
    """
    Schedule taxi or landing operation
    """
    logger.info("SCHEDULE_OPERATION_ENDPOINT: Received payload: aircraft_id=%s, operation_type=%s, priority=%s, pad_id=%s, scheduled_time=%s, operator=%s",
                payload.aircraft_id, payload.operation_type, payload.priority, payload.pad_id, payload.scheduled_time, operator)

    scheduler = SchedulerService(db)

    try:
        result = scheduler.schedule_operation(
            aircraft_id=payload.aircraft_id,
            operation_type=payload.operation_type.value,
            priority=payload.priority,
            pad_id=payload.pad_id,
            scheduled_time=payload.scheduled_time,
            operator_id=operator,
        )
        logger.info("SCHEDULE_OPERATION_SUCCESS: Result status=%s", result.get("status"))
        broadcast_system_update_sync(db)
        return result

    except HTTPException:
        logger.error("SCHEDULE_OPERATION_FAILED: HTTPException raised")
        raise
    except Exception as e:
        logger.exception("SCHEDULE_OPERATION_FAILED: Exception occurred: %s (type=%s)", str(e), type(e).__name__)
        raise HTTPException(status_code=400, detail=str(e))