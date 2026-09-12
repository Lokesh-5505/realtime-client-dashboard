"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateTaskDetails = exports.updateTaskStatus = exports.createTask = exports.getTaskById = exports.getTasks = void 0;
const database_1 = require("../config/database");
const client_1 = require("@prisma/client");
const activityService_1 = require("./activityService");
const notificationService_1 = require("./notificationService");
const socketHandler_1 = require("../sockets/socketHandler");
const getTasks = async (user, filters) => {
    const where = {};
    // Role scoping
    if (user.role === client_1.Role.ADMIN) {
        if (filters.projectId) {
            where.projectId = filters.projectId;
        }
    }
    else if (user.role === client_1.Role.PROJECT_MANAGER) {
        // PM can only view tasks from projects they manage
        where.project = {
            managerId: user.id,
        };
        if (filters.projectId) {
            where.projectId = filters.projectId;
        }
    }
    else if (user.role === client_1.Role.DEVELOPER) {
        // Developer can ONLY view tasks assigned to them
        where.assignedToId = user.id;
        if (filters.projectId) {
            where.projectId = filters.projectId;
        }
    }
    // Filters
    if (filters.status) {
        where.status = filters.status;
    }
    if (filters.priority) {
        where.priority = filters.priority;
    }
    if (filters.dueFrom || filters.dueTo) {
        where.dueDate = {};
        if (filters.dueFrom)
            where.dueDate.gte = filters.dueFrom;
        if (filters.dueTo)
            where.dueDate.lte = filters.dueTo;
    }
    if (filters.search) {
        where.OR = [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
        ];
    }
    // Developers sort by priority (CRITICAL -> LOW) then dueDate
    const orderBy = user.role === client_1.Role.DEVELOPER
        ? [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }];
    return database_1.prisma.task.findMany({
        where,
        orderBy,
        include: {
            project: {
                select: { id: true, name: true, managerId: true },
            },
            assignedTo: {
                select: { id: true, name: true, email: true, role: true, avatarUrl: true },
            },
        },
    });
};
exports.getTasks = getTasks;
const getTaskById = async (taskId, user) => {
    const task = await database_1.prisma.task.findUnique({
        where: { id: taskId },
        include: {
            project: {
                select: { id: true, name: true, managerId: true },
            },
            assignedTo: {
                select: { id: true, name: true, email: true, role: true, avatarUrl: true },
            },
            activityLogs: {
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    user: { select: { id: true, name: true, avatarUrl: true } },
                },
            },
        },
    });
    if (!task) {
        return null;
    }
    // Role access check
    if (user.role === client_1.Role.PROJECT_MANAGER && task.project.managerId !== user.id) {
        throw new Error('FORBIDDEN_PROJECT_ACCESS');
    }
    if (user.role === client_1.Role.DEVELOPER && task.assignedToId !== user.id) {
        throw new Error('FORBIDDEN_TASK_ACCESS');
    }
    return task;
};
exports.getTaskById = getTaskById;
const createTask = async (data, user) => {
    // Verify project existence and PM ownership
    const project = await database_1.prisma.project.findUnique({
        where: { id: data.projectId },
    });
    if (!project) {
        throw new Error('PROJECT_NOT_FOUND');
    }
    if (user.role === client_1.Role.PROJECT_MANAGER && project.managerId !== user.id) {
        throw new Error('FORBIDDEN_NOT_PROJECT_OWNER');
    }
    // Check if assignedTo is a developer
    if (data.assignedToId) {
        const dev = await database_1.prisma.user.findUnique({
            where: { id: data.assignedToId },
        });
        if (!dev || dev.role !== client_1.Role.DEVELOPER) {
            throw new Error('INVALID_DEVELOPER_ASSIGNMENT');
        }
    }
    const isOverdue = data.dueDate ? new Date(data.dueDate) < new Date() : false;
    const task = await database_1.prisma.task.create({
        data: {
            title: data.title,
            description: data.description,
            projectId: data.projectId,
            assignedToId: data.assignedToId,
            priority: data.priority || client_1.Priority.MEDIUM,
            dueDate: data.dueDate,
            isOverdue,
            status: client_1.TaskStatus.TODO,
        },
        include: {
            project: true,
            assignedTo: true,
        },
    });
    // Create activity log
    await (0, activityService_1.createActivityLog)({
        projectId: task.projectId,
        taskId: task.id,
        userId: user.id,
        action: 'TASK_CREATED',
        newState: task.status,
        message: `${user.name} created Task #${task.taskNumber}: "${task.title}"`,
        assignedToId: task.assignedToId,
        managerId: project.managerId,
    });
    // Notify assigned developer
    if (task.assignedToId) {
        await (0, notificationService_1.createNotification)({
            userId: task.assignedToId,
            title: 'New Task Assigned',
            message: `${user.name} assigned you Task #${task.taskNumber}: "${task.title}" in project "${project.name}"`,
            link: `/tasks?projectId=${project.id}`,
        });
    }
    (0, socketHandler_1.broadcastTaskChange)(task.projectId, task);
    return task;
};
exports.createTask = createTask;
const updateTaskStatus = async (taskId, newStatus, user) => {
    const task = await database_1.prisma.task.findUnique({
        where: { id: taskId },
        include: { project: true, assignedTo: true },
    });
    if (!task) {
        throw new Error('TASK_NOT_FOUND');
    }
    // RBAC checks
    if (user.role === client_1.Role.DEVELOPER && task.assignedToId !== user.id) {
        throw new Error('FORBIDDEN_TASK_ACCESS');
    }
    if (user.role === client_1.Role.PROJECT_MANAGER && task.project.managerId !== user.id) {
        throw new Error('FORBIDDEN_PROJECT_ACCESS');
    }
    const prevStatus = task.status;
    if (prevStatus === newStatus) {
        return task;
    }
    const formatStatus = (s) => {
        switch (s) {
            case client_1.TaskStatus.TODO:
                return 'To Do';
            case client_1.TaskStatus.IN_PROGRESS:
                return 'In Progress';
            case client_1.TaskStatus.IN_REVIEW:
                return 'In Review';
            case client_1.TaskStatus.DONE:
                return 'Done';
            default:
                return s;
        }
    };
    const updatedTask = await database_1.prisma.task.update({
        where: { id: taskId },
        data: { status: newStatus },
        include: { project: true, assignedTo: true },
    });
    // Human-readable status change formatting:
    // "Ravi moved Task #12 from In Progress → In Review"
    const message = `${user.name} moved Task #${task.taskNumber} from ${formatStatus(prevStatus)} → ${formatStatus(newStatus)}`;
    await (0, activityService_1.createActivityLog)({
        projectId: task.projectId,
        taskId: task.id,
        userId: user.id,
        action: 'TASK_STATUS_CHANGED',
        previousState: prevStatus,
        newState: newStatus,
        message,
        assignedToId: task.assignedToId,
        managerId: task.project.managerId,
    });
    // PM Alert: When a task in their project is moved to In Review, notify the PM
    if (newStatus === client_1.TaskStatus.IN_REVIEW && task.project.managerId) {
        await (0, notificationService_1.createNotification)({
            userId: task.project.managerId,
            title: 'Task Ready for Review',
            message: `${user.name} moved Task #${task.taskNumber} ("${task.title}") to In Review`,
            link: `/tasks?projectId=${task.projectId}`,
        });
    }
    (0, socketHandler_1.broadcastTaskChange)(task.projectId, updatedTask);
    return updatedTask;
};
exports.updateTaskStatus = updateTaskStatus;
const updateTaskDetails = async (taskId, data, user) => {
    // Only Admin or PM can edit full details
    if (user.role === client_1.Role.DEVELOPER) {
        throw new Error('FORBIDDEN_FULL_EDIT_DEVELOPER');
    }
    const task = await database_1.prisma.task.findUnique({
        where: { id: taskId },
        include: { project: true },
    });
    if (!task) {
        throw new Error('TASK_NOT_FOUND');
    }
    if (user.role === client_1.Role.PROJECT_MANAGER && task.project.managerId !== user.id) {
        throw new Error('FORBIDDEN_PROJECT_ACCESS');
    }
    const previousAssignedId = task.assignedToId;
    const isOverdue = data.dueDate
        ? new Date(data.dueDate) < new Date() && task.status !== client_1.TaskStatus.DONE
        : data.dueDate === null
            ? false
            : task.isOverdue;
    const updatedTask = await database_1.prisma.task.update({
        where: { id: taskId },
        data: {
            ...data,
            isOverdue,
        },
        include: { project: true, assignedTo: true },
    });
    // If newly assigned or reassigned to a developer
    if (data.assignedToId && data.assignedToId !== previousAssignedId) {
        await (0, notificationService_1.createNotification)({
            userId: data.assignedToId,
            title: 'Task Assigned',
            message: `${user.name} assigned you Task #${updatedTask.taskNumber}: "${updatedTask.title}"`,
            link: `/tasks?projectId=${task.projectId}`,
        });
        await (0, activityService_1.createActivityLog)({
            projectId: task.projectId,
            taskId: task.id,
            userId: user.id,
            action: 'TASK_ASSIGNED',
            message: `${user.name} assigned Task #${updatedTask.taskNumber} to ${updatedTask.assignedTo?.name || 'Developer'}`,
            assignedToId: updatedTask.assignedToId,
            managerId: task.project.managerId,
        });
    }
    (0, socketHandler_1.broadcastTaskChange)(task.projectId, updatedTask);
    return updatedTask;
};
exports.updateTaskDetails = updateTaskDetails;
const deleteTask = async (taskId, user) => {
    if (user.role === client_1.Role.DEVELOPER) {
        throw new Error('FORBIDDEN_DELETE');
    }
    const task = await database_1.prisma.task.findUnique({
        where: { id: taskId },
        include: { project: true },
    });
    if (!task) {
        throw new Error('TASK_NOT_FOUND');
    }
    if (user.role === client_1.Role.PROJECT_MANAGER && task.project.managerId !== user.id) {
        throw new Error('FORBIDDEN_PROJECT_ACCESS');
    }
    await database_1.prisma.task.delete({
        where: { id: taskId },
    });
    return { success: true };
};
exports.deleteTask = deleteTask;
