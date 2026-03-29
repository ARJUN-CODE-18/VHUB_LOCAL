#!/usr/bin/env python3
"""
Simple script to verify WebSocket support in uvicorn.
"""
import asyncio
import sys
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from contextlib import asynccontextmanager

print("Testing WebSocket support...")
print(f"Python version: {sys.version}")

# Check for websockets library
try:
    import websockets
    print(f"✓ websockets library: {websockets.__version__}")
except ImportError:
    print("✗ websockets library NOT found")
    sys.exit(1)

# Check for wsproto (alternative)
try:
    import wsproto
    print(f"✓ wsproto library available")
except ImportError:
    print("ℹ wsproto library not found (not required, websockets is used)")

# Try to import uvicorn
try:
    import uvicorn
    print(f"✓ uvicorn: {uvicorn.__version__}")
except ImportError:
    print("✗ uvicorn NOT found")
    sys.exit(1)

# Create a minimal FastAPI app with WebSocket
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("App starting...")
    yield
    print("App shutting down...")

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connection accepted")
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        print("WebSocket disconnected")

if __name__ == "__main__":
    print("\n✓ WebSocket support verified!")
    print("Starting test server on http://127.0.0.1:8001")
    print("WebSocket endpoint at ws://127.0.0.1:8001/ws")
    print("Run test_client.py in another terminal to test")
    
    # Start server
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="info")
