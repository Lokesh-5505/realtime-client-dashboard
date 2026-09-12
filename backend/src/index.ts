import http from 'http';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env';
import apiRouter from './routes';
import { errorHandler } from './middleware/errorHandler';
import { initSocket } from './sockets/socketHandler';
import { startOverdueScheduler } from './jobs/overdueScheduler';

import { isOriginAllowed } from './config/cors';

const app = express();
const server = http.createServer(app);

// Security & Parsing Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root welcome & API status route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PulseAgency Real-Time Backend API is running.',
    version: '1.0.0',
    websocket: 'Socket.io Active',
    endpoints: {
      health: '/health',
      api: '/api',
    },
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', apiRouter);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// Centralized structured error handler
app.use(errorHandler);

// Initialize WebSocket engine and background cron only in persistent environments
if (!process.env.VERCEL) {
  initSocket(server);
  startOverdueScheduler();
}

// Start standalone HTTP server when not in test or Vercel serverless runtime
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  server.listen(ENV.PORT, () => {
    console.log(`=========================================`);
    console.log(` Agency Server running on port ${ENV.PORT}`);
    console.log(` Environment: ${ENV.NODE_ENV}`);
    console.log(` Client URL: ${ENV.CLIENT_URL}`);
    console.log(` WebSocket: Socket.io Active`);
    console.log(`=========================================`);
  });
}

export { app, server };
export default app;
