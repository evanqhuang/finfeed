import os
import subprocess
import base64
import numpy as np
from dotenv import load_dotenv
from picamera2 import Picamera2
from time import sleep

load_dotenv()

AUTH_LOGIN = os.getenv("AUTH_LOGIN")
AUTH_PASSWORD = os.getenv("AUTH_PASSWORD")
SERVER_IP = "localhost"
PORT = "3000"
ENV = os.getenv("ENV")

if ENV == "prod":
    SERVER_IP = os.getenv("SERVER_IP")
    PORT = "443"

WIDTH, HEIGHT = 1280, 720

auth_header = base64.b64encode(f"{AUTH_LOGIN}:{AUTH_PASSWORD}".encode()).decode()
upload_base = f"http://{SERVER_IP}:{PORT}/upload"

def stream_webcam_to_hls():
    # Initialize PiCamera2
    picam2 = Picamera2()

    # Configure camera
    config = picam2.create_video_configuration(main={"size": (WIDTH, HEIGHT), "format": "BGR888"})
    picam2.configure(config)

    # Start the camera
    picam2.start()

    # Give the camera a moment to adjust
    sleep(2)

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
        # Warmup frames
        for _ in range(10):
            picam2.capture_array()

        while True:
            # Capture a frame
            frame = picam2.capture_array("main")
            # Write to ffmpeg's stdin
            ffmpeg_process.stdin.write(frame.tobytes())
    except KeyboardInterrupt:
        print("Stopping stream...")
    finally:
        # Clean up
        picam2.stop()
        ffmpeg_process.stdin.close()
        ffmpeg_process.terminate()
        ffmpeg_process.wait()

if __name__ == "__main__":
    stream_webcam_to_hls()

