from fastapi import APIRouter, Request
from app.db.session import engine

router = APIRouter(prefix="/debug", tags=["debug"])

@router.get("/db")
def check_database():
    return {
        "database_url": str(engine.url),
        "dialect": engine.dialect.name,
        "driver": engine.dialect.driver,
    }

@router.get("/headers")
async def debug_headers(request: Request):
    """
    Return all request headers.
    Use this to verify that X-API-Key is arriving from the frontend.
    """
    return dict(request.headers)