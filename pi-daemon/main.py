import cv2
import websockets
import asyncio
import base64
import os
from dotenv import load_dotenv

load_dotenv()

AUTH_LOGIN = os.getenv("AUTH_LOGIN")
AUTH_PASSWORD = os.getenv("AUTH_PASSWORD")
SERVER_IP = os.getenv("SERVER_IP", "localhost")
PORT = os.getenv("PORT", "3000")

# Encode credentials as base64
auth_string = f"{AUTH_LOGIN}:{AUTH_PASSWORD}"
auth_b64 = base64.b64encode(auth_string.encode()).decode("utf-8")

async def stream():
    uri = f"ws://{SERVER_IP}:{PORT}/stream"
    headers = {
        "Authorization": f"Basic {auth_b64}"
    }

    cap = cv2.VideoCapture(0)

    async with websockets.connect(uri, additional_headers=headers) as websocket:
        while True:
            ret, frame = cap.read()
            if not ret:
                continue

            _, buffer = cv2.imencode('.jpg', frame)
            jpg_base64 = base64.b64encode(buffer).decode('utf-8')

            await websocket.send(jpg_base64)
            await asyncio.sleep(0.03)  # ~30 fps

asyncio.run(stream())
