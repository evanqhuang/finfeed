import { Request, Response, NextFunction } from 'express';
import { isAuthorized } from '../auth';
import { DEBUG } from '../config';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!isAuthorized(req)) {
    res.set('WWW-Authenticate', 'Basic realm="Upload Stream"');
    res.status(401).send('Authentication required to upload the stream.');
    return;
  }
  if (DEBUG) {
    console.log(`Authenticated upload request from ${req.ip}`);
  }
  next();
}
