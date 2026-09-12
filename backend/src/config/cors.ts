import { ENV } from './env';

const allowedOrigins = [
  ENV.CLIENT_URL?.replace(/\/$/, ''),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean) as string[];

/**
 * Checks whether a given origin is allowed to connect via CORS or WebSocket.
 * Supports configured CLIENT_URL, local dev ports, and all *.vercel.app deployments.
 */
export const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true; // Allow curl, server-to-server, cron jobs, etc.
  const clean = origin.replace(/\/$/, '');
  if (allowedOrigins.includes(clean)) return true;
  if (/^https:\/\/.*\.vercel\.app$/.test(clean)) return true;
  return false;
};
