import express from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const hlsDir = path.join(__dirname, '../../hls');

router.use((req: express.Request, res: express.Response, next: express.NextFunction): void => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.url.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (req.url.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/MP2T');
    }

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }

    next();
});

router.use(express.static(hlsDir));

router.get('/debug', (_, res) => {
    fs.readdir(hlsDir, (err, files) => {
        if (err) return res.status(500).send(`Error reading dir: ${err.message}`);
        res.send(`HLS Directory:\n${files.join('\n')}`);
    });
});

export default router;
