import fs from 'fs';
import path from 'path';
import { DEBUG } from './config';

export function cleanOldSegments(directory: string, maxAgeSeconds: number) {
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
              } else if (DEBUG) {
                console.log(`Deleted old segment: ${file}`);
              }
            });
          }
        });
      }
    });
  });
}
