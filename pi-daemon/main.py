import cv2
import socket
import struct
import os
from dotenv import load_dotenv

load_dotenv()
WEB_HOST = os.getenv('WEB_HOST', 'localhost')  # Default to localhost if ENV is not set
WEB_PORT = os.getenv('WEB_PORT')  

# Initialize video capture
cap = cv2.VideoCapture(0)  # Use the first camera
if not cap.isOpened():
    print("Error: Could not open video stream.")
    exit()

# Create a socket connection
client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client_socket.connect((WEB_HOST, WEB_PORT))

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error: Could not read frame.")
            break

        # Encode the frame as JPEG
        _, buffer = cv2.imencode('.jpg', frame)

        # Send the size of the frame
        frame_size = len(buffer)
        client_socket.sendall(struct.pack('!I', frame_size))

        # Send the frame data
        client_socket.sendall(buffer)

except KeyboardInterrupt:
    print("Streaming stopped.")

finally:
    cap.release()
    client_socket.close()