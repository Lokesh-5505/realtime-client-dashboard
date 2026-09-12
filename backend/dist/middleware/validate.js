"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = exports.validateBody = void 0;
const zod_1 = require("zod");
const response_1 = require("../utils/response");
const validateBody = (schema) => {
    return async (req, res, next) => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const issues = error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));
                return (0, response_1.sendError)(res, 'Request validation failed', 422, 'VALIDATION_ERROR', issues);
            }
            return (0, response_1.sendError)(res, 'Malformed request data', 400, 'MALFORMED_REQUEST');
        }
    };
};
exports.validateBody = validateBody;
const validateQuery = (schema) => {
    return async (req, res, next) => {
        try {
            req.query = (await schema.parseAsync(req.query));
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const issues = error.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                }));
                return (0, response_1.sendError)(res, 'Query parameter validation failed', 422, 'VALIDATION_ERROR', issues);
            }
            return (0, response_1.sendError)(res, 'Malformed query parameters', 400, 'MALFORMED_REQUEST');
        }
    };
};
exports.validateQuery = validateQuery;
