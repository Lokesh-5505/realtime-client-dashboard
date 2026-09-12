import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { ENV } from '../config/env';
import { prisma } from '../config/database';
import { Role } from '@prisma/client';

export interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

let io: Server | null = null;
// Track userId -> Set of socket IDs (to support multiple tabs per user)
const onlineUsers = new Map<string, Set<string>>();

import { isOriginAllowed } from '../config/cors';

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Origin not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
  });

  // Socket Authentication Handshake Middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
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

      const payload = verifyAccessToken(token);
      socket.user = payload;
      next();
    } catch (err: any) {
      console.error('[Socket Auth Error]:', err.message);
      return next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    const userId = user.id;
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    console.log(`[Socket Connected] User: ${user.name} (${user.role}) - Socket: ${socket.id}`);

    // Join personal notification and direct message room
    socket.join(`user_${userId}`);

    // Join role-specific channels
    if (user.role === Role.ADMIN) {
      socket.join('admin_global');
    } else if (user.role === Role.PROJECT_MANAGER) {
      socket.join(`pm_${userId}`);
      // Auto-join projects managed by this PM
      try {
        const projects = await prisma.project.findMany({
          where: { managerId: userId },
          select: { id: true },
        });
        projects.forEach((p) => socket.join(`project_${p.id}`));
      } catch (err) {
        console.error('Error auto-joining PM projects:', err);
      }
    } else if (user.role === Role.DEVELOPER) {
      socket.join(`dev_${userId}`);
      // Join projects where this developer has tasks
      try {
        const tasks = await prisma.task.findMany({
          where: { assignedToId: userId },
          select: { projectId: true },
          distinct: ['projectId'],
        });
        tasks.forEach((t) => socket.join(`project_${t.projectId}`));
      } catch (err) {
        console.error('Error auto-joining Dev projects:', err);
      }
    }

    // Broadcast updated presence
    emitPresence();

    // Client requests to subscribe to a specific project feed
    socket.on('join_project', async (projectId: string) => {
      if (!projectId) return;

      // Access control check before joining project room
      if (user.role === Role.ADMIN) {
        socket.join(`project_${projectId}`);
      } else if (user.role === Role.PROJECT_MANAGER) {
        const project = await prisma.project.findFirst({
          where: { id: projectId, managerId: user.id },
        });
        if (project) {
          socket.join(`project_${projectId}`);
        }
      } else if (user.role === Role.DEVELOPER) {
        // Dev can only join if assigned a task in this project
        const hasTask = await prisma.task.findFirst({
          where: { projectId, assignedToId: user.id },
        });
        if (hasTask) {
          socket.join(`project_${projectId}`);
        }
      }
    });

    socket.on('leave_project', (projectId: string) => {
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
      emitPresence();
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
};

export const getOnlineUserStats = () => {
  return {
    count: onlineUsers.size,
    userIds: Array.from(onlineUsers.keys()),
  };
};

export const emitPresence = () => {
  if (!io) return;
  const stats = getOnlineUserStats();
  // Broadcast presence to admin global and general room
  io.emit('presence_update', stats);
};

export const broadcastActivityEvent = (payload: {
  activity: any;
  projectId: string;
  assignedToId?: string | null;
  managerId?: string | null;
}) => {
  if (!io) return;

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

export const sendLiveNotification = (userId: string, notification: any) => {
  if (!io) return;
  io.to(`user_${userId}`).emit('new_notification', notification);
};

export const broadcastTaskChange = (projectId: string, task: any) => {
  if (!io) return;
  // Broadcast task data to everyone in project room & admin global
  io.to(`project_${projectId}`).emit('task_updated', task);
  io.to('admin_global').emit('task_updated', task);
  if (task.assignedToId) {
    io.to(`user_${task.assignedToId}`).emit('task_updated', task);
  }
};

function parseCookies(cookieHeader: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('='));
    }
  });

  return list;
}
