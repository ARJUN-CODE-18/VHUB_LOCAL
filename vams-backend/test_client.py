#!/usr/bin/env python3
"""
Simple WebSocket client to test the connection.
"""
import asyncio
import websockets
import sys

async def test_websocket():
    uri = "ws://127.0.0.1:8001/ws"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✓ WebSocket connection successful!")
            
            # Send a test message
            await websocket.send("Hello, WebSocket!")
            response = await websocket.recv()
            print(f"✓ Received response: {response}")
            
            return True
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(test_websocket())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("Interrupted")
        sys.exit(1)
