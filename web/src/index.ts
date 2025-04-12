import express from 'express';
import http from 'http'; // Use HTTP instead of HTTPS
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.WEB_PORT; // Use a custom port for HTTP

// Middleware for basic authentication
const basicAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log('Basic Auth Middleware triggered');
  const auth = {
    login: process.env.AUTH_LOGIN, // Read login from environment variable
    password: process.env.AUTH_PASSWORD, // Read password from environment variable
  };

  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (login && password && login === auth.login && password === auth.password) {
    console.log('Authentication successful');
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="401"'); // Change this as needed
  res.status(401).send('Authentication required.');
};

// Middleware to restrict access to a specific IP
const ipWhitelistMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log('IP Whitelist Middleware triggered');
  const allowedIP = process.env.ALLOWED_IP;
  const requestIP = req.ip;

  if (requestIP === allowedIP) {
    console.log(`Access granted to IP: ${requestIP}`);
    return next();
  }

  console.warn(`Unauthorized access attempt from IP: ${requestIP}`);
  res.status(403).send('Forbidden: Access is restricted to a specific IP.');
};

// Apply authentication and IP filtering middleware to the `/stream` endpoint
app.post('/stream', basicAuthMiddleware, ipWhitelistMiddleware, (req, res) => {
  const streamPath = path.join(__dirname, 'stream.mp4');
  const writeStream = fs.createWriteStream(streamPath);

  req.pipe(writeStream);

  writeStream.on('finish', () => {
    res.status(200).send('Stream received.');
  });

  writeStream.on('error', (err) => {
    console.error('Error writing stream:', err);
    res.status(500).send('Error receiving stream.');
  });
});

// Serve the video stream on the homepage
app.get('/', (req, res) => {
  const streamPath = path.join(__dirname, 'stream.mp4');

  if (fs.existsSync(streamPath)) {
    res.send(`
      <html>
        <body>
          <h1>Video Stream</h1>
          <video controls autoplay>
            <source src="/video" type="video/mp4">
          </video>
        </body>
      </html>
    `);
  } else {
    res.send('<h1>No video stream available</h1>');
  }
});

// Endpoint to serve the video file
app.get('/video', (req, res) => {
  const streamPath = path.join(__dirname, 'stream.mp4');

  if (fs.existsSync(streamPath)) {
    res.setHeader('Content-Type', 'video/mp4');
    fs.createReadStream(streamPath).pipe(res);
  } else {
    res.status(404).send('Video not found.');
  }
});

// Start the HTTP server
http.createServer(app).listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
});