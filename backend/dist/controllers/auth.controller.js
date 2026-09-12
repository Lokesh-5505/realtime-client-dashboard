"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDemoUsers = exports.getMe = exports.logout = exports.refresh = exports.login = exports.loginSchema = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const jwt_1 = require("../utils/jwt");
const env_1 = require("../config/env");
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await database_1.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user) {
            return (0, response_1.sendError)(res, 'Invalid credentials provided.', 401, 'INVALID_CREDENTIALS');
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return (0, response_1.sendError)(res, 'Invalid credentials provided.', 401, 'INVALID_CREDENTIALS');
        }
        // Generate tokens
        const accessToken = (0, jwt_1.signAccessToken)({
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        });
        const { rawToken, tokenHash, expiresAt } = (0, jwt_1.generateRefreshToken)();
        // Store hashed refresh token in database
        await database_1.prisma.refreshToken.create({
            data: {
                tokenHash,
                userId: user.id,
                expiresAt,
            },
        });
        // Set refresh token in HttpOnly cookie
        const isProduction = env_1.ENV.NODE_ENV === 'production';
        res.cookie('refreshToken', rawToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/',
            maxAge: env_1.ENV.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        });
        return (0, response_1.sendSuccess)(res, {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatarUrl: user.avatarUrl,
            },
        }, 'Login successful');
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const refresh = async (req, res, next) => {
    try {
        const rawToken = req.cookies?.refreshToken;
        if (!rawToken) {
            return (0, response_1.sendError)(res, 'Refresh token is missing from cookie.', 401, 'REFRESH_TOKEN_REQUIRED');
        }
        const tokenHash = (0, jwt_1.hashToken)(rawToken);
        const tokenRecord = await database_1.prisma.refreshToken.findUnique({
            where: { tokenHash },
            include: { user: true },
        });
        if (!tokenRecord || tokenRecord.revokedAt || new Date() > tokenRecord.expiresAt) {
            // Clear cookie
            const isProduction = env_1.ENV.NODE_ENV === 'production';
            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'none' : 'lax',
                path: '/',
            });
            return (0, response_1.sendError)(res, 'Refresh token is expired or revoked. Please log in again.', 401, 'INVALID_REFRESH_TOKEN');
        }
        // Generate new Access Token
        const user = tokenRecord.user;
        const accessToken = (0, jwt_1.signAccessToken)({
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        });
        return (0, response_1.sendSuccess)(res, {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                avatarUrl: user.avatarUrl,
            },
        }, 'Access token refreshed successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.refresh = refresh;
const logout = async (req, res, next) => {
    try {
        const rawToken = req.cookies?.refreshToken;
        if (rawToken) {
            const tokenHash = (0, jwt_1.hashToken)(rawToken);
            await database_1.prisma.refreshToken.updateMany({
                where: { tokenHash },
                data: { revokedAt: new Date() },
            });
        }
        const isProduction = env_1.ENV.NODE_ENV === 'production';
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/',
        });
        return (0, response_1.sendSuccess)(res, null, 'Logged out successfully');
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
const getMe = async (req, res, next) => {
    try {
        if (!req.user) {
            return (0, response_1.sendError)(res, 'Not authenticated', 401, 'UNAUTHORIZED');
        }
        const user = await database_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatarUrl: true,
                createdAt: true,
            },
        });
        if (!user) {
            return (0, response_1.sendError)(res, 'User profile not found', 404, 'NOT_FOUND');
        }
        return (0, response_1.sendSuccess)(res, user);
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
// Quick Demo Login endpoint to make pairing & role testing seamless
const getDemoUsers = async (req, res, next) => {
    try {
        const users = await database_1.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatarUrl: true,
            },
            orderBy: [{ role: 'asc' }, { name: 'asc' }],
        });
        return (0, response_1.sendSuccess)(res, users);
    }
    catch (error) {
        next(error);
    }
};
exports.getDemoUsers = getDemoUsers;
