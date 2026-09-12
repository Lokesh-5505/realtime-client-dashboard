"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const socketHandler_1 = require("./sockets/socketHandler");
const overdueScheduler_1 = require("./jobs/overdueScheduler");
const cors_2 = require("./config/cors");
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
// Security & Parsing Middlewares
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if ((0, cors_2.isOriginAllowed)(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api', routes_1.default);
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
app.use(errorHandler_1.errorHandler);
// Initialize WebSocket engine and background cron only in persistent environments
if (!process.env.VERCEL) {
    (0, socketHandler_1.initSocket)(server);
    (0, overdueScheduler_1.startOverdueScheduler)();
}
// Start standalone HTTP server when not in test or Vercel serverless runtime
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    server.listen(env_1.ENV.PORT, () => {
        console.log(`=========================================`);
        console.log(` Agency Server running on port ${env_1.ENV.PORT}`);
        console.log(` Environment: ${env_1.ENV.NODE_ENV}`);
        console.log(` Client URL: ${env_1.ENV.CLIENT_URL}`);
        console.log(` WebSocket: Socket.io Active`);
        console.log(`=========================================`);
    });
}
exports.default = app;
