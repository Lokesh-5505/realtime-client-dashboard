"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastTaskChange = exports.sendLiveNotification = exports.broadcastActivityEvent = exports.emitPresence = exports.getOnlineUserStats = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jwt_1 = require("../utils/jwt");
const database_1 = require("../config/database");
const client_1 = require("@prisma/client");
let io = null;
// Track userId -> Set of socket IDs (to support multiple tabs per user)
const onlineUsers = new Map();
const cors_1 = require("../config/cors");
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: (origin, callback) => {
                if ((0, cors_1.isOriginAllowed)(origin)) {
                    return callback(null, true);
                }
                return callback(new Error('Origin not allowed by CORS'));
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        },
    });
    // Socket Authentication Handshake Middleware
    io.use(async (socket, next) => {
        try {
            let token = socket.handshake.auth?.token;
            // Also check headers or cookie if not in auth payload
            if (!token && socket.handshake.headers.authorization) {
                const parts = socket.handshake.headers.authorization.split(' ');
                if (parts.length === 2 && parts[0] === 'Bearer') {
                    token = parts[1];
                }
            }
            if (!token && socket.handshake.headers.cookie) {
                const cookies = parseCookies(socket.handshake.headers.cookie);
                token = cookies.accessToken;
            }
            if (!token) {
                return next(new Error('Authentication token required for WebSocket connection'));
            }
            const payload = (0, jwt_1.verifyAccessToken)(token);
            socket.user = payload;
            next();
        }
        catch (err) {
            console.error('[Socket Auth Error]:', err.message);
            return next(new Error('Authentication failed'));
        }
    });
    io.on('connection', async (socket) => {
        const user = socket.user;
        if (!user) {
            socket.disconnect(true);
            return;
        }
        const userId = user.id;
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);
        console.log(`[Socket Connected] User: ${user.name} (${user.role}) - Socket: ${socket.id}`);
        // Join personal notification and direct message room
        socket.join(`user_${userId}`);
        // Join role-specific channels
        if (user.role === client_1.Role.ADMIN) {
            socket.join('admin_global');
        }
        else if (user.role === client_1.Role.PROJECT_MANAGER) {
            socket.join(`pm_${userId}`);
            // Auto-join projects managed by this PM
            try {
                const projects = await database_1.prisma.project.findMany({
                    where: { managerId: userId },
                    select: { id: true },
                });
                projects.forEach((p) => socket.join(`project_${p.id}`));
            }
            catch (err) {
                console.error('Error auto-joining PM projects:', err);
            }
        }
        else if (user.role === client_1.Role.DEVELOPER) {
            socket.join(`dev_${userId}`);
            // Join projects where this developer has tasks
            try {
                const tasks = await database_1.prisma.task.findMany({
                    where: { assignedToId: userId },
                    select: { projectId: true },
                    distinct: ['projectId'],
                });
                tasks.forEach((t) => socket.join(`project_${t.projectId}`));
            }
            catch (err) {
                console.error('Error auto-joining Dev projects:', err);
            }
        }
        // Broadcast updated presence
        (0, exports.emitPresence)();
        // Client requests to subscribe to a specific project feed
        socket.on('join_project', async (projectId) => {
            if (!projectId)
                return;
            // Access control check before joining project room
            if (user.role === client_1.Role.ADMIN) {
                socket.join(`project_${projectId}`);
            }
            else if (user.role === client_1.Role.PROJECT_MANAGER) {
                const project = await database_1.prisma.project.findFirst({
                    where: { id: projectId, managerId: user.id },
                });
                if (project) {
                    socket.join(`project_${projectId}`);
                }
            }
            else if (user.role === client_1.Role.DEVELOPER) {
                // Dev can only join if assigned a task in this project
                const hasTask = await database_1.prisma.task.findFirst({
                    where: { projectId, assignedToId: user.id },
                });
                if (hasTask) {
                    socket.join(`project_${projectId}`);
                }
            }
        });
        socket.on('leave_project', (projectId) => {
            if (projectId) {
                socket.leave(`project_${projectId}`);
            }
        });
        socket.on('disconnect', () => {
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                }
            }
            console.log(`[Socket Disconnected] User: ${user.name} - Socket: ${socket.id}`);
            (0, exports.emitPresence)();
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io has not been initialized');
    }
    return io;
};
exports.getIO = getIO;
const getOnlineUserStats = () => {
    return {
        count: onlineUsers.size,
        userIds: Array.from(onlineUsers.keys()),
    };
};
exports.getOnlineUserStats = getOnlineUserStats;
const emitPresence = () => {
    if (!io)
        return;
    const stats = (0, exports.getOnlineUserStats)();
    // Broadcast presence to admin global and general room
    io.emit('presence_update', stats);
};
exports.emitPresence = emitPresence;
const broadcastActivityEvent = (payload) => {
    if (!io)
        return;
    const { activity, projectId, assignedToId, managerId } = payload;
    // 1. Admin sees everything in global feed
    io.to('admin_global').emit('activity_feed_update', activity);
    // 2. PM sees activity for their projects
    if (managerId) {
        io.to(`pm_${managerId}`).emit('activity_feed_update', activity);
    }
    // 3. Any user currently viewing this project room
    io.to(`project_${projectId}`).emit('activity_feed_update', activity);
    // 4. Developer sees activity on tasks assigned to them
    if (assignedToId) {
        io.to(`user_${assignedToId}`).emit('activity_feed_update', activity);
    }
};
exports.broadcastActivityEvent = broadcastActivityEvent;
const sendLiveNotification = (userId, notification) => {
    if (!io)
        return;
    io.to(`user_${userId}`).emit('new_notification', notification);
};
exports.sendLiveNotification = sendLiveNotification;
const broadcastTaskChange = (projectId, task) => {
    if (!io)
        return;
    // Broadcast task data to everyone in project room & admin global
    io.to(`project_${projectId}`).emit('task_updated', task);
    io.to('admin_global').emit('task_updated', task);
    if (task.assignedToId) {
        io.to(`user_${task.assignedToId}`).emit('task_updated', task);
    }
};
exports.broadcastTaskChange = broadcastTaskChange;
function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader)
        return list;
    cookieHeader.split(';').forEach((cookie) => {
        const parts = cookie.split('=');
        const name = parts.shift()?.trim();
        if (name) {
            list[name] = decodeURIComponent(parts.join('='));
        }
    });
    return list;
}
