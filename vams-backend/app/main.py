"""
Main FastAPI application entry point.
Configures routes, middleware, and startup/shutdown events.
"""
from fastapi import FastAPI
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.events import EventLogger, EventType, EventSeverity
from app.db.session import engine
from app.db.models.audit import AuditLog
from app.db.session import SessionLocal
from app.db.seed_default_user import ensure_default_user
from datetime import datetime
import logging
from app.api.routes import debug
from app.api.routes import operations
from app.core.realtime import manager, build_updated_state

# Import routers
from app.api.routes import (
    auth,
    aircraft,
    pad,
    slots,
    weather,
    energy,
    groundops,
    emergency,
    dashboard,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting VAMS Backend")
    logger.info("Database initialization delegated to Alembic migrations")
    
    # Log system startup
    db = SessionLocal()
    try:
        created_default_user = ensure_default_user(db)
        if created_default_user:
            logger.info("Default auth user created")

        event = EventLogger.create_event(
            event_type=EventType.SYSTEM_STARTUP,
            severity=EventSeverity.INFO,
            entity_type="system",
            details={"version": settings.APP_VERSION},
        )
        audit_log = AuditLog(
            event_type=event.event_type,
            severity=event.severity,
            timestamp=event.timestamp,
            entity_type=event.entity_type,
            details=event.to_json(),
        )
        db.add(audit_log)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log startup event: {e}")
    finally:
        db.close()
    
    logger.info("VAMS Backend started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down VAMS Backend")
    
    # Log system shutdown
    db = SessionLocal()
    try:
        event = EventLogger.create_event(
            event_type=EventType.SYSTEM_SHUTDOWN,
            severity=EventSeverity.INFO,
            entity_type="system",
            details={"timestamp": datetime.utcnow().isoformat()},
        )
        audit_log = AuditLog(
            event_type=event.event_type,
            severity=event.severity,
            timestamp=event.timestamp,
            entity_type=event.entity_type,
            details=event.to_json(),
        )
        db.add(audit_log)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log shutdown event: {e}")
    finally:
        db.close()
    
    logger.info("VAMS Backend shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Vertiport Automation & Management System - Safety-Critical Backend",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(operations.router)

# Include routers
app.include_router(auth.router)
app.include_router(aircraft.router)
app.include_router(pad.router)
app.include_router(slots.router)
app.include_router(weather.router)
app.include_router(energy.router)
app.include_router(groundops.router)
app.include_router(emergency.router)
app.include_router(dashboard.router)
app.include_router(debug.router)


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "vertipad_id": settings.VERTIPAD_ID,
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time system updates"""
    await manager.connect(websocket)
    logger.info(f"WebSocket connection opened. Total connections: {len(manager.active_connections)}")
    db = SessionLocal()
    try:
        # Send initial state on connection
        updated_state = build_updated_state(db)
        await websocket.send_json(
            {
                "type": "UPDATE",
                "data": updated_state,
                "pads": updated_state["pads"],
                "aircraft": updated_state["aircraft"],
            }
        )
        logger.info("Initial state sent to WebSocket client")
        
        # Keep connection open and listen for ping/keep-alive messages
        while True:
            data = await websocket.receive_text()
            logger.debug(f"WebSocket received message: {data}")
    except WebSocketDisconnect:
        logger.info(f"WebSocket connection closed. Total connections: {len(manager.active_connections)}")
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {type(e).__name__}: {str(e)}")
        manager.disconnect(websocket)
    finally:
        db.close()