"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOriginAllowed = void 0;
const env_1 = require("./env");
const allowedOrigins = [
    env_1.ENV.CLIENT_URL?.replace(/\/$/, ''),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
].filter(Boolean);
/**
 * Checks whether a given origin is allowed to connect via CORS or WebSocket.
 * Supports configured CLIENT_URL, local dev ports, and all *.vercel.app deployments.
 */
const isOriginAllowed = (origin) => {
    if (!origin)
        return true; // Allow curl, server-to-server, cron jobs, etc.
    const clean = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(clean))
        return true;
    if (/^https:\/\/.*\.vercel\.app$/.test(clean))
        return true;
    return false;
};
exports.isOriginAllowed = isOriginAllowed;
