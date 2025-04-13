import os
import cv2
import subprocess
import base64
from dotenv import load_dotenv

load_dotenv()

AUTH_LOGIN = os.getenv("AUTH_LOGIN")
AUTH_PASSWORD = os.getenv("AUTH_PASSWORD")
SERVER_IP = os.getenv("SERVER_IP", "localhost")
PORT = os.getenv("PORT", "3000")
ENV = os.getenv("ENV", "dev")

if ENV == "prod":
    SERVER_IP = "finfeed.evanqhuang.com"
    PORT = "443"

WIDTH, HEIGHT = 1280, 720

auth_header = base64.b64encode(f"{AUTH_LOGIN}:{AUTH_PASSWORD}".encode()).decode()
upload_base = f"http://{SERVER_IP}:{PORT}/upload"

def stream_webcam_to_hls():
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)

    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    ffmpeg_command = [
        "ffmpeg",
        "-f", "rawvideo",
        "-pix_fmt", "bgr24", 
        "-s", f"{WIDTH}x{HEIGHT}",
        "-i", "-",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        "-profile:v", "baseline",
        "-level", "3.0",
        "-tune", "zerolatency",
        "-hls_time", "15",
        "-hls_list_size", "0",
        "-hls_flags", "delete_segments+append_list",
        "-hls_segment_filename", f"{upload_base}/segment_%03d.ts",
        "-f", "hls",
        "-method", "PUT",
        "-headers", f"Authorization: Basic {auth_header}\r\n",
        f"{upload_base}/stream.m3u8"
    ]

    ffmpeg_process = subprocess.Popen(ffmpeg_command, stdin=subprocess.PIPE)

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Error: Could not read frame from webcam.")
                break
            ffmpeg_process.stdin.write(frame.tobytes())
    except KeyboardInterrupt:
        print("Stopping stream...")
    finally:
        cap.release()
        ffmpeg_process.stdin.close()
        ffmpeg_process.terminate()
        ffmpeg_process.wait()


if __name__ == "__main__":
    stream_webcam_to_hls()
