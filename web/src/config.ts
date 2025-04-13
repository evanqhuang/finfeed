import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const AUTH_LOGIN = process.env.AUTH_LOGIN!;
export const AUTH_PASSWORD = process.env.AUTH_PASSWORD!;
export const DEBUG = process.env.DEBUG === 'true';
