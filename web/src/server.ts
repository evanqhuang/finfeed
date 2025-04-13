import express from 'express';
import http from 'http';
import path from 'path';
import { PORT } from './config';
import { cleanOldSegments } from './cleanup';
import uploadRouter from './routes/upload';
import hlsRouter from './routes/hls';
import { authMiddleware } from './middleware/authMiddleware';

const app = express();
const server = http.createServer(app);

// Auth middleware only for uploads
app.use('/upload', authMiddleware, uploadRouter);
app.use('/hls', hlsRouter);

app.use(express.static(path.join(__dirname, 'static')));
// Serve index page
app.get('/', (_, res) => {
    res.sendFile(path.join(__dirname, 'static', 'index.html'));
});


// Start periodic cleanup
setInterval(() => {
    const hlsDir = path.join(__dirname, '../hls');
    cleanOldSegments(hlsDir, 60 * 5); // 60 seconds
}, 60 * 1000);

server.listen(PORT, () => {
    console.log(`🚀 HLS server running on http://localhost:${PORT}`);
});
