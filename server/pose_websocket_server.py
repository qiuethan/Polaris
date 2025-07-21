import os
import asyncio
import websockets
from websockets.exceptions import ConnectionClosedError

# Load allowed origins and API token from environment
ALLOWED_ORIGINS = set(os.getenv("ALLOWED_ORIGINS", "").split(","))
API_TOKEN = os.getenv("POSE_WS_API_TOKEN", "")
MAX_CLIENTS = int(os.getenv("POSE_WS_MAX_CLIENTS", "10"))

connected = set()

async def handler(ws, path):
    # Origin check
    origin = ws.request_headers.get('Origin')
    if origin not in ALLOWED_ORIGINS:
        await ws.close(code=4003, reason="Unauthorized origin")
        return

    # Token-based authentication
    token = ws.request_headers.get('X-API-Token')
    if token != API_TOKEN or len(connected) >= MAX_CLIENTS:
        await ws.close(code=4003, reason="Authentication failed or server busy")
        return

    connected.add(ws)
    try:
        async for msg in ws:
            # Only allow ping/pong or controlled commands if needed
            # Here: broadcast camera frames after verification
            if msg == "PING":
                await ws.send("PONG")
            # (Insert additional message handlers as needed)
    except ConnectionClosedError:
        pass
    finally:
        connected.remove(ws)

async def broadcast(frame_bytes: bytes):
    # Broadcast binary frames to authorized clients
    for ws in set(connected):
        try:
            await ws.send(frame_bytes)
        except ConnectionClosedError:
            connected.remove(ws)

if __name__ == '__main__':
    port = int(os.getenv('POSE_WS_PORT', '8765'))
    start_server = websockets.serve(
        handler, '0.0.0.0', port,
        ssl=None,  # Terminate SSL at reverse proxy, not here
        max_size=2**20,  # 1MB max message size
        max_queue=32
    )
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()
