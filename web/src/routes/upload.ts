import express from 'express';
import fs from 'fs';
import path from 'path';
import { DEBUG } from '../config';

const router = express.Router();
const hlsDir = path.join(__dirname, '../../hls');

router.put('/:filename', (req, res) => {
    const filePath = path.join(hlsDir, req.params.filename);
    let responded = false;

    if (DEBUG) {
        console.log(`Received file upload request for: ${filePath}`);
    }

    // Ensure the /hls directory exists
    if (!fs.existsSync(hlsDir)) {
        fs.mkdirSync(hlsDir, { recursive: true });
    }

    // Save the uploaded file
    // const writeStream = fs.createWriteStream(filePath);
    const writeStream = fs.createWriteStream(filePath, { flags: 'w' });

    req.pipe(writeStream);

    writeStream.on('finish', () => {
        if (DEBUG) {
            console.log(`File upload complete: ${filePath}`);
        }
        fs.stat(filePath, (err, stats) => {
            if (err) return console.error('Stat error:', err);
            console.log(`Segment saved (${stats.size} bytes):`, filePath);
        });
        if (responded) {
            res.status(200).send('File uploaded successfully.');
            responded = true
        }
    });

    writeStream.on('error', (err) => {
        if (DEBUG) {
            console.error(`Error writing file: ${err.message}`);
        }
        if (responded) {
            res.status(500).send('Error saving file.');
            responded = true
        }
    });
});

export default router;
