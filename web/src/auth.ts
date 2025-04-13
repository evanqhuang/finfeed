import { AUTH_LOGIN, AUTH_PASSWORD } from './config';
import { Request } from 'express';

export function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.authorization || '';
  const b64auth = authHeader.split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
  return login === AUTH_LOGIN && password === AUTH_PASSWORD;
}
