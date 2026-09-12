"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
const authenticate = (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    else if (req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
    }
    if (!token) {
        return (0, response_1.sendError)(res, 'Authentication required. No token provided.', 401, 'UNAUTHORIZED');
    }
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.user = payload;
        next();
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            return (0, response_1.sendError)(res, 'Access token has expired. Please refresh your session.', 401, 'TOKEN_EXPIRED');
        }
        return (0, response_1.sendError)(res, 'Invalid or corrupted access token.', 401, 'INVALID_TOKEN');
    }
};
exports.authenticate = authenticate;
