"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdminOrPM = exports.requireAdmin = exports.authorize = void 0;
const client_1 = require("@prisma/client");
const response_1 = require("../utils/response");
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return (0, response_1.sendError)(res, 'Authentication required before checking permissions.', 401, 'UNAUTHORIZED');
        }
        if (!allowedRoles.includes(req.user.role)) {
            return (0, response_1.sendError)(res, `Access denied. You do not have permission to perform this action. Required: [${allowedRoles.join(', ')}], Current: ${req.user.role}`, 403, 'FORBIDDEN');
        }
        next();
    };
};
exports.authorize = authorize;
exports.requireAdmin = (0, exports.authorize)(client_1.Role.ADMIN);
exports.requireAdminOrPM = (0, exports.authorize)(client_1.Role.ADMIN, client_1.Role.PROJECT_MANAGER);
