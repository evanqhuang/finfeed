import os
import sys
import subprocess
from time import sleep
from dotenv import load_dotenv
from picamera2 import Picamera2

load_dotenv()

TWITCH_STREAM_KEY = os.getenv("TWITCH_STREAM_KEY")

if not TWITCH_STREAM_KEY:
    print("Error: TWITCH_STREAM_KEY is not set in the environment.")
    sys.exit(1)

RTMP_URL = f"rtmp://live.twitch.tv/app/{TWITCH_STREAM_KEY}"
WIDTH, HEIGHT = 640, 480

print(f"Streaming to Twitch with resolution {WIDTH}x{HEIGHT}")


def stream_to_twitch():
    picam2 = Picamera2()
    config = picam2.create_video_configuration(main={"size": (WIDTH, HEIGHT), "format": "BGR888"})
    picam2.configure(config)
    picam2.start()
    sleep(2)

    ffmpeg_command = [
        "ffmpeg",
        "-f", "rawvideo",
        "-pix_fmt", "bgr24",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-r", "30",
        "-i", "-",
        "-f", "lavfi",
        "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-c:v", "h264_v4l2m2m",
        "-b:v", "1000k",
        "-maxrate", "1000k",
        "-bufsize", "2000k",
        "-g", "60",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        "-f", "flv",
        RTMP_URL,
    ]

    ffmpeg_process = subprocess.Popen(ffmpeg_command, stdin=subprocess.PIPE)

    try:
        for _ in range(10):
            picam2.capture_array()

        while True:
            frame = picam2.capture_array("main")
            ffmpeg_process.stdin.write(frame.tobytes())
    except KeyboardInterrupt:
        print("Stopping stream...")
    finally:
        picam2.stop()
        ffmpeg_process.stdin.close()
        ffmpeg_process.terminate()
        ffmpeg_process.wait()


if __name__ == "__main__":
    stream_to_twitch()
