"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTask = exports.updateDetails = exports.updateStatus = exports.createTask = exports.getTask = exports.listTasks = exports.updateTaskDetailsSchema = exports.updateTaskStatusSchema = exports.createTaskSchema = exports.listTasksQuerySchema = void 0;
const zod_1 = require("zod");
const taskService = __importStar(require("../services/taskService"));
const response_1 = require("../utils/response");
const client_1 = require("@prisma/client");
exports.listTasksQuerySchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.TaskStatus).optional(),
    priority: zod_1.z.nativeEnum(client_1.Priority).optional(),
    dueFrom: zod_1.z.string().datetime().optional().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    dueTo: zod_1.z.string().datetime().optional().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    search: zod_1.z.string().optional(),
    projectId: zod_1.z.string().uuid().optional(),
});
exports.createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).max(200),
    description: zod_1.z.string().optional(),
    projectId: zod_1.z.string().uuid(),
    assignedToId: zod_1.z.string().uuid().optional(),
    priority: zod_1.z.nativeEnum(client_1.Priority).optional(),
    dueDate: zod_1.z.string().datetime().optional().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()),
});
exports.updateTaskStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(client_1.TaskStatus),
});
exports.updateTaskDetailsSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).max(200).optional(),
    description: zod_1.z.string().optional(),
    assignedToId: zod_1.z.string().uuid().nullable().optional(),
    priority: zod_1.z.nativeEnum(client_1.Priority).optional(),
    dueDate: zod_1.z.string().datetime().nullable().optional().or(zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}/).nullable().optional()),
});
const listTasks = async (req, res, next) => {
    try {
        const query = req.query;
        const tasks = await taskService.getTasks(req.user, {
            status: query.status,
            priority: query.priority,
            dueFrom: query.dueFrom ? new Date(query.dueFrom) : undefined,
            dueTo: query.dueTo ? new Date(query.dueTo) : undefined,
            search: query.search,
            projectId: query.projectId,
        });
        return (0, response_1.sendSuccess)(res, tasks);
    }
    catch (error) {
        next(error);
    }
};
exports.listTasks = listTasks;
const getTask = async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const task = await taskService.getTaskById(id, req.user);
        if (!task) {
            return (0, response_1.sendError)(res, 'Task not found', 404, 'NOT_FOUND');
        }
        return (0, response_1.sendSuccess)(res, task);
    }
    catch (error) {
        if (error.message === 'FORBIDDEN_PROJECT_ACCESS' || error.message === 'FORBIDDEN_TASK_ACCESS') {
            return (0, response_1.sendError)(res, 'You do not have permission to view this task', 403, 'FORBIDDEN');
        }
        next(error);
    }
};
exports.getTask = getTask;
const createTask = async (req, res, next) => {
    try {
        const { title, description, projectId, assignedToId, priority, dueDate } = req.body;
        const task = await taskService.createTask({
            title,
            description,
            projectId,
            assignedToId,
            priority,
            dueDate: dueDate ? new Date(dueDate) : undefined,
        }, req.user);
        return (0, response_1.sendSuccess)(res, task, 'Task created successfully', 201);
    }
    catch (error) {
        if (error.message === 'PROJECT_NOT_FOUND') {
            return (0, response_1.sendError)(res, 'Associated project not found', 404, 'NOT_FOUND');
        }
        if (error.message === 'FORBIDDEN_NOT_PROJECT_OWNER') {
            return (0, response_1.sendError)(res, 'You can only create tasks for projects you manage', 403, 'FORBIDDEN');
        }
        if (error.message === 'INVALID_DEVELOPER_ASSIGNMENT') {
            return (0, response_1.sendError)(res, 'Assigned user must be a Developer', 422, 'INVALID_ASSIGNMENT');
        }
        next(error);
    }
};
exports.createTask = createTask;
const updateStatus = async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const { status } = req.body;
        const updated = await taskService.updateTaskStatus(id, status, req.user);
        return (0, response_1.sendSuccess)(res, updated, 'Task status updated');
    }
    catch (error) {
        if (error.message === 'TASK_NOT_FOUND') {
            return (0, response_1.sendError)(res, 'Task not found', 404, 'NOT_FOUND');
        }
        if (error.message === 'FORBIDDEN_TASK_ACCESS') {
            return (0, response_1.sendError)(res, 'Developers can only update status of tasks assigned to them', 403, 'FORBIDDEN');
        }
        if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
            return (0, response_1.sendError)(res, 'You do not have permission to update tasks in another PM\'s project', 403, 'FORBIDDEN');
        }
        next(error);
    }
};
exports.updateStatus = updateStatus;
const updateDetails = async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const { title, description, assignedToId, priority, dueDate } = req.body;
        const updated = await taskService.updateTaskDetails(id, {
            title,
            description,
            assignedToId,
            priority,
            dueDate: dueDate ? new Date(dueDate) : dueDate === null ? null : undefined,
        }, req.user);
        return (0, response_1.sendSuccess)(res, updated, 'Task details updated');
    }
    catch (error) {
        if (error.message === 'FORBIDDEN_FULL_EDIT_DEVELOPER') {
            return (0, response_1.sendError)(res, 'Developers cannot modify task metadata. You can only update task status.', 403, 'FORBIDDEN');
        }
        if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
            return (0, response_1.sendError)(res, 'You can only modify tasks for your own projects', 403, 'FORBIDDEN');
        }
        if (error.message === 'TASK_NOT_FOUND') {
            return (0, response_1.sendError)(res, 'Task not found', 404, 'NOT_FOUND');
        }
        next(error);
    }
};
exports.updateDetails = updateDetails;
const deleteTask = async (req, res, next) => {
    try {
        const id = String(req.params.id);
        await taskService.deleteTask(id, req.user);
        return (0, response_1.sendSuccess)(res, null, 'Task deleted successfully');
    }
    catch (error) {
        if (error.message === 'FORBIDDEN_DELETE') {
            return (0, response_1.sendError)(res, 'Developers cannot delete tasks', 403, 'FORBIDDEN');
        }
        if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
            return (0, response_1.sendError)(res, 'You can only delete tasks from your own projects', 403, 'FORBIDDEN');
        }
        if (error.message === 'TASK_NOT_FOUND') {
            return (0, response_1.sendError)(res, 'Task not found', 404, 'NOT_FOUND');
        }
        next(error);
    }
};
exports.deleteTask = deleteTask;
