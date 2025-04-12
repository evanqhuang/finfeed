import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const AUTH_LOGIN = process.env.AUTH_LOGIN;
const AUTH_PASSWORD = process.env.AUTH_PASSWORD;
const DEBUG = process.env.DEBUG === 'true';

// Cleanup old segments function
function cleanOldSegments(directory: string, maxAgeSeconds: number) {
  const now = Date.now();

  fs.readdir(directory, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(directory, file);
      if (filePath.endsWith('.ts')) {
        fs.stat(filePath, (err, stats) => {
          if (err) {
            console.error('Error checking file stats:', err);
            return;
          }

          const ageInSeconds = (now - stats.mtimeMs) / 1000;
          if (ageInSeconds > maxAgeSeconds) {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error('Error deleting file:', err);
              } else {
                if (DEBUG) {
                  console.log(`Deleted old segment: ${file}`);
                }
              }
            });
          }
        });
      }
    });
  });
}

// Set a cleanup interval (e.g., every minute)
setInterval(() => {
  const hlsDir = path.join(__dirname, '../hls');
  const maxAgeSeconds = 60;  // 1 minute
  cleanOldSegments(hlsDir, maxAgeSeconds);
}, 60 * 1000);  // Every minute


// 🧠 Auth helper for Pi
function isAuthorized(req: express.Request): boolean {
  const authHeader = req.headers.authorization || '';
  const b64auth = authHeader.split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
  return login === AUTH_LOGIN && password === AUTH_PASSWORD;
}

// Middleware for Pi authentication (only for HLS uploads)
app.use('/upload', (req, res, next) => {
  if (!isAuthorized(req)) {
    res.set('WWW-Authenticate', 'Basic realm="Upload Stream"');
    res.status(401).send('Authentication required to upload the stream.');
    return;
  }
  if (DEBUG) {
    console.log(`Authenticated upload request from ${req.ip}`);
  }
  next();
});

app.get('/debug/hls', (_, res) => {
  const hlsDir = path.join(__dirname, '../hls');
  fs.readdir(hlsDir, (err, files) => {
    if (err) {
      res.status(500).send(`Error reading HLS directory: ${err.message}`);
      return;
    }
    res.send(`HLS Directory Contents:\n${files.join('\n')}`);
  });
});

app.put('/upload/:filename', (req, res) => {
  const hlsDir = path.join(__dirname, '../hls');
  const filePath = path.join(hlsDir, req.params.filename);

  if (DEBUG) {
    console.log(`Received file upload request for: ${filePath}`);
  }

  // Ensure the /hls directory exists
  if (!fs.existsSync(hlsDir)) {
    fs.mkdirSync(hlsDir, { recursive: true });
  }

  // Save the uploaded file
  const writeStream = fs.createWriteStream(filePath);
  req.pipe(writeStream);

  writeStream.on('finish', () => {
    if (DEBUG) {
      console.log(`File upload complete: ${filePath}`);
    }
    res.status(200).send('File uploaded successfully.');
  });

  writeStream.on('error', (err) => {
    if (DEBUG) {
      console.error(`Error writing file: ${err.message}`);
    }
    res.status(500).send('Error saving file.');
  });
});

// Add CORS headers and proper permissions for HLS files
app.use('/hls', (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  // Set proper content types
  if (req.url.endsWith('.m3u8')) {
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  } else if (req.url.endsWith('.ts')) {
    res.setHeader('Content-Type', 'video/MP2T');
  }

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }

  next();
});

// Serve HLS files (no auth for viewers)
app.use('/hls', express.static(path.join(__dirname, '../hls')));

// Serve the web page (no auth for viewers)
app.get('/', (_, res) => {
  res.send(`
    <html>
      <head>
        <title>FinFeed</title>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.12"></script>
        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: linear-gradient(to bottom, #87CEEB, #4682B4);
            color: white;
            text-align: center;
          }

          h1 {
            margin: 0;
            padding: 20px;
            background: rgba(0, 0, 0, 0.5);
            font-size: 3em;
            text-shadow: 2px 2px 4px #000;
          }

          #tank {
            position: relative;
            width: 640px;
            height: 360px; /* Adjusted for 16:9 aspect ratio */
            margin: 20px auto;
            border: 10px solid #2E8B57;
            border-radius: 20px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            background: rgba(0, 0, 0, 0.2);
            overflow: hidden;
          }

          video {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .bubbles {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 0;
          }

          .bubble {
            position: absolute;
            bottom: -50px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            opacity: 0.8;
            animation: rise ease-in forwards;
          }

          @keyframes rise {
            0% {
              transform: translateY(0) scale(0.5);
              opacity: 0.8;
            }
            50% {
              opacity: 1;
            }
            100% {
              transform: translateY(-100vh) scale(1);
              opacity: 0;
            }
          }

          /* Responsive styles for smaller screens */
          @media (max-width: 768px) {
            h1 {
              font-size: 2em;
              padding: 15px;
            }

            #tank {
              width: 90%;
              height: auto;
              aspect-ratio: 16 / 9; /* Maintain 16:9 aspect ratio */
              margin: 10px auto;
              border-width: 5px;
            }

            .bubble {
              width: 15px;
              height: 15px;
            }
          }

          @media (max-width: 480px) {
            h1 {
              font-size: 1.5em;
              padding: 10px;
            }

            #tank {
              width: 100%;
              height: auto;
              aspect-ratio: 16 / 9; /* Maintain 16:9 aspect ratio */
              margin: 5px auto;
              border-width: 3px;
            }

            .bubble {
              width: 10px;
              height: 10px;
            }
          }
        </style>
      </head>
      <body>
        <h1>🐟 FinFeed</h1>

        <div class="bubbles" id="bubbles-container"></div>

        <div id="tank">
          <video id="video" controls autoplay></video>
        </div>
      
        <script>
          // 🎥 HLS video stream
          const video = document.getElementById('video');
          if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = '/hls/stream.m3u8';
          } else {
            alert('Your browser does not support HLS.');
          }

          // 🎈 Bubble creation logic
          const container = document.getElementById('bubbles-container');

          function createBubble() {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';

            const size = Math.random() * 30 + 10;
            bubble.style.width = size + 'px';
            bubble.style.height = size + 'px';
            bubble.style.left = Math.random() * 100 + '%';
            bubble.style.animationDuration = (Math.random() * 4 + 4) + 's';

            container.appendChild(bubble);

            // Remove after animation
            setTimeout(() => {
              bubble.remove();
            }, 8000);
          }

          setInterval(createBubble, 300);
        </script>
      </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log(`🚀 HLS server running on http://localhost:${PORT}`);
});