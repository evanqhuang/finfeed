import os
import sys
import cv2
import subprocess
from dotenv import load_dotenv

load_dotenv()

TWITCH_STREAM_KEY = os.getenv("TWITCH_STREAM_KEY")

if not TWITCH_STREAM_KEY:
    print("Error: TWITCH_STREAM_KEY is not set in the environment.")
    sys.exit(1)

RTMP_URL = f"rtmp://live.twitch.tv/app/{TWITCH_STREAM_KEY}"
WIDTH, HEIGHT = 1280, 720

print(f"Streaming to Twitch with resolution {WIDTH}x{HEIGHT}")


def stream_webcam_to_twitch():
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
        "-r", "30",
        "-i", "-",
        "-f", "lavfi",
        "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        "-profile:v", "baseline",
        "-level", "3.1",
        "-tune", "zerolatency",
        "-b:v", "2500k",
        "-maxrate", "2500k",
        "-bufsize", "5000k",
        "-g", "60",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        "-f", "flv",
        RTMP_URL,
    ]

    ffmpeg_process = subprocess.Popen(ffmpeg_command, stdin=subprocess.PIPE)

    if ffmpeg_process.stdin is None:
        print("Error: Could not open ffmpeg stdin.")
        return

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
    stream_webcam_to_twitch()
