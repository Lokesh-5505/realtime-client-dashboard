"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startOverdueScheduler = exports.checkOverdueTasks = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = require("../config/database");
const client_1 = require("@prisma/client");
const activityService_1 = require("../services/activityService");
const notificationService_1 = require("../services/notificationService");
const socketHandler_1 = require("../sockets/socketHandler");
const checkOverdueTasks = async () => {
    const now = new Date();
    try {
        // Find all tasks that have passed due date, are not done, and not yet flagged as overdue
        const tasksToFlag = await database_1.prisma.task.findMany({
            where: {
                dueDate: {
                    lt: now,
                },
                status: {
                    not: client_1.TaskStatus.DONE,
                },
                isOverdue: false,
            },
            include: {
                project: {
                    select: { id: true, name: true, managerId: true },
                },
                assignedTo: {
                    select: { id: true, name: true },
                },
            },
        });
        if (tasksToFlag.length === 0) {
            return 0;
        }
        console.log(`[Overdue Cron Job] Detected ${tasksToFlag.length} overdue task(s). Flagging...`);
        for (const task of tasksToFlag) {
            // Mark overdue in DB
            const updated = await database_1.prisma.task.update({
                where: { id: task.id },
                data: { isOverdue: true },
                include: {
                    project: true,
                    assignedTo: true,
                },
            });
            // System activity log
            await (0, activityService_1.createActivityLog)({
                projectId: task.projectId,
                taskId: task.id,
                userId: task.project.managerId, // Attribute or link to project context
                action: 'TASK_OVERDUE',
                message: `Task #${task.taskNumber} ("${task.title}") flagged as Overdue by System Scheduler`,
                assignedToId: task.assignedToId,
                managerId: task.project.managerId,
            });
            // Notify assigned developer
            if (task.assignedToId) {
                await (0, notificationService_1.createNotification)({
                    userId: task.assignedToId,
                    title: 'Task Overdue Alert',
                    message: `Task #${task.taskNumber} ("${task.title}") has passed its due date and is now Overdue`,
                    link: `/tasks?projectId=${task.projectId}`,
                });
            }
            // Notify project manager
            if (task.project.managerId) {
                await (0, notificationService_1.createNotification)({
                    userId: task.project.managerId,
                    title: 'Project Task Overdue',
                    message: `Task #${task.taskNumber} in project "${task.project.name}" is now Overdue`,
                    link: `/tasks?projectId=${task.projectId}`,
                });
            }
            (0, socketHandler_1.broadcastTaskChange)(task.projectId, updated);
        }
        return tasksToFlag.length;
    }
    catch (error) {
        console.error('[Overdue Cron Job Error]:', error);
        return 0;
    }
};
exports.checkOverdueTasks = checkOverdueTasks;
const startOverdueScheduler = () => {
    console.log('[Scheduler] Initializing Overdue Task background scheduler (node-cron)...');
    // Run initial check on startup
    (0, exports.checkOverdueTasks)();
    // Schedule to run every minute
    const task = node_cron_1.default.schedule('* * * * *', async () => {
        await (0, exports.checkOverdueTasks)();
    });
    return task;
};
exports.startOverdueScheduler = startOverdueScheduler;
