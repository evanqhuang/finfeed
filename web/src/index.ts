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
      <body>
        <h1>📺 Live Feed</h1>
        <img id="stream" width="640" />
        <script>
          const ws = new WebSocket('ws://' + location.host + '/view');
          const img = document.getElementById('stream');
          ws.onmessage = e => {
            img.src = 'data:image/jpeg;base64,' + e.data;
          };
        </script>
      </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log(`🚀 Auth-enabled WebSocket server on ${PORT}`);
});
