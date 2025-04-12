import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true }); // manual upgrade

const PORT = process.env.PORT || 3000;
const AUTH_LOGIN = process.env.AUTH_LOGIN;
const AUTH_PASSWORD = process.env.AUTH_PASSWORD;
const ALLOWED_IP = process.env.ALLOWED_IP;

// 🧠 Auth helper
function isAuthorized(req: http.IncomingMessage): boolean {
  const authHeader = req.headers.authorization || '';
  const b64auth = authHeader.split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
  return login === AUTH_LOGIN && password === AUTH_PASSWORD;
}

// 🔐 IP whitelist
function isAllowedIP(req: http.IncomingMessage): boolean {
  const ip = req.socket.remoteAddress || '';
  return ip === ALLOWED_IP;
}

// 👁️ viewer set + last frame
let viewers = new Set<WebSocket>();
let latestFrame = '';

wss.on('connection', (ws, req) => {
  const url = req.url || '';
  console.log(`🔗 New connection request: ${url}`);

  if (url === '/stream') {
    console.log('📡 Pi connected');
    ws.on('message', (data: Buffer) => {
      latestFrame = data.toString();
      viewers.forEach((viewer) => {
        if (viewer.readyState === WebSocket.OPEN) {
          viewer.send(latestFrame);
        }
      });
    });
    ws.on('close', () => console.log('Pi disconnected'));
  }

  if (url === '/view') {
    console.log('👀 Viewer connected');
    viewers.add(ws);
    ws.on('close', () => viewers.delete(ws));
  }
});

// 🖥️ Handle raw upgrade w/ auth + IP
server.on('upgrade', (req, socket, head) => {
  const pathname = req.url || '';
  console.log(`🔗 Upgrade request: ${pathname}`);

  if (pathname === '/stream') {
    if (!isAuthorized(req)) {
      console.log('❌ Unauthorized access attempt');
      socket.write('HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm="Stream"\r\n\r\n');
      socket.destroy();
      return;
    }
    // if (!isAllowedIP(req)) {
    //   socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    //   socket.destroy();
    //   return;
    // }
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

// 👁️ Web view
app.get('/', (_, res) => {
  res.send(`
    <html>
      <head>
        <title>FinFeed</title>
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
            height: 480px;
            margin: 20px auto;
            border: 10px solid #2E8B57;
            border-radius: 20px;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
            background: rgba(0, 0, 0, 0.2);
            overflow: hidden;
          }
  
          #stream {
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
        </style>
      </head>
      <body>
        <h1>🐟 FinFeed</h1>
  
        <div class="bubbles" id="bubbles-container"></div>
  
        <div id="tank">
          <img id="stream" />
        </div>
  
        <script>
          // 🔌 WebSocket stream
          const ws = new WebSocket('wss://' + location.host + '/view');
          const img = document.getElementById('stream');
          ws.onmessage = e => {
            img.src = 'data:image/jpeg;base64,' + e.data;
          };
  
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
  console.log(`🚀 Auth-enabled WebSocket server on ${PORT}`);
});
