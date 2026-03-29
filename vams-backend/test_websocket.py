#!/usr/bin/env python3
"""Simple script to verify WebSocket support in uvicorn."""

import sys
from contextlib import asynccontextmanager
from importlib import metadata

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn


def print_environment() -> None:
    print("Testing WebSocket support...")
    print(f"Python version: {sys.version}")
    try:
        websockets_version = metadata.version("websockets")
        print(f"websockets library: {websockets_version}")
    except metadata.PackageNotFoundError:
        print("websockets library NOT found")
        raise SystemExit(1)
    print(f"uvicorn: {uvicorn.__version__}")


@asynccontextmanager
async def lifespan(_app: FastAPI):
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
    print_environment()
    print("\nWebSocket support verified")
    print("Starting test server on http://127.0.0.1:8001")
    print("WebSocket endpoint at ws://127.0.0.1:8001/ws")
    print("Run test_client.py in another terminal to test")
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="info")
