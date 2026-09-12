"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoleFilteredActivityFeed = exports.createActivityLog = void 0;
const database_1 = require("../config/database");
const client_1 = require("@prisma/client");
const socketHandler_1 = require("../sockets/socketHandler");
const createActivityLog = async (input) => {
    const log = await database_1.prisma.activityLog.create({
        data: {
            projectId: input.projectId,
            taskId: input.taskId,
            userId: input.userId,
            action: input.action,
            previousState: input.previousState,
            newState: input.newState,
            message: input.message,
        },
        include: {
            user: {
                select: { id: true, name: true, email: true, role: true, avatarUrl: true },
            },
            project: {
                select: { id: true, name: true, managerId: true },
            },
            task: {
                select: { id: true, taskNumber: true, title: true, status: true, assignedToId: true },
            },
        },
    });
    // Real-time broadcast
    (0, socketHandler_1.broadcastActivityEvent)({
        activity: log,
        projectId: input.projectId,
        assignedToId: input.assignedToId || log.task?.assignedToId,
        managerId: input.managerId || log.project?.managerId,
    });
    return log;
};
exports.createActivityLog = createActivityLog;
const getRoleFilteredActivityFeed = async (user, limit = 20, since) => {
    const whereClause = {};
    if (since) {
        whereClause.createdAt = { gt: since };
    }
    if (user.role === client_1.Role.ADMIN) {
        // Admin sees all activity across all projects
    }
    else if (user.role === client_1.Role.PROJECT_MANAGER) {
        // PM sees activity only from their own projects
        whereClause.project = {
            managerId: user.id,
        };
    }
    else if (user.role === client_1.Role.DEVELOPER) {
        // Developer sees activity only on tasks assigned to them
        whereClause.task = {
            assignedToId: user.id,
        };
    }
    return database_1.prisma.activityLog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            user: {
                select: { id: true, name: true, email: true, role: true, avatarUrl: true },
            },
            project: {
                select: { id: true, name: true },
            },
            task: {
                select: { id: true, taskNumber: true, title: true, status: true },
            },
        },
    });
};
exports.getRoleFilteredActivityFeed = getRoleFilteredActivityFeed;
