"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const response_1 = require("../utils/response");
const errorHandler = (err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) => {
    console.error(`[Error] [${req.method}] ${req.originalUrl}:`, err);
    // Prisma known errors
    if (err.code === 'P2002') {
        return (0, response_1.sendError)(res, 'A unique constraint violation occurred on the submitted field.', 409, 'DUPLICATE_ENTRY');
    }
    if (err.code === 'P2025') {
        return (0, response_1.sendError)(res, 'Requested resource was not found in the database.', 404, 'NOT_FOUND');
    }
    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'An internal server error occurred. Please try again later.'
        : err.message || 'An unexpected error occurred';
    return (0, response_1.sendError)(res, message, statusCode, err.code || 'INTERNAL_SERVER_ERROR', process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined);
};
exports.errorHandler = errorHandler;
