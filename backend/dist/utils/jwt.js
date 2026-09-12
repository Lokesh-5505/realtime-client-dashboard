"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashToken = exports.generateRefreshToken = exports.verifyAccessToken = exports.signAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
const signAccessToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, env_1.ENV.JWT_ACCESS_SECRET, {
        expiresIn: '15m',
    });
};
exports.signAccessToken = signAccessToken;
const verifyAccessToken = (token) => {
    return jsonwebtoken_1.default.verify(token, env_1.ENV.JWT_ACCESS_SECRET);
};
exports.verifyAccessToken = verifyAccessToken;
const generateRefreshToken = () => {
    const rawToken = crypto_1.default.randomBytes(40).toString('hex');
    const tokenHash = (0, exports.hashToken)(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env_1.ENV.REFRESH_TOKEN_EXPIRY_DAYS);
    return { rawToken, tokenHash, expiresAt };
};
exports.generateRefreshToken = generateRefreshToken;
const hashToken = (token) => {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
};
exports.hashToken = hashToken;
