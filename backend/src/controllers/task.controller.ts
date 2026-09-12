import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as taskService from '../services/taskService';
import { sendSuccess, sendError } from '../utils/response';
import { TaskStatus, Priority } from '@prisma/client';

export const listTasksQuerySchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueFrom: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  dueTo: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  search: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  projectId: z.string().uuid(),
  assignedToId: z.string().uuid().optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()),
});

export const updateTaskStatusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
});

export const updateTaskDetailsSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  assignedToId: z.string().uuid().nullable().optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime().nullable().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).nullable().optional()),
});

export const listTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query as any;
    const tasks = await taskService.getTasks(req.user!, {
      status: query.status,
      priority: query.priority,
      dueFrom: query.dueFrom ? new Date(query.dueFrom) : undefined,
      dueTo: query.dueTo ? new Date(query.dueTo) : undefined,
      search: query.search,
      projectId: query.projectId,
    });
    return sendSuccess(res, tasks);
  } catch (error) {
    next(error);
  }
};

export const getTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const task = await taskService.getTaskById(id, req.user!);
    if (!task) {
      return sendError(res, 'Task not found', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, task);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN_PROJECT_ACCESS' || error.message === 'FORBIDDEN_TASK_ACCESS') {
      return sendError(res, 'You do not have permission to view this task', 403, 'FORBIDDEN');
    }
    next(error);
  }
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, projectId, assignedToId, priority, dueDate } = req.body;
    const task = await taskService.createTask(
      {
        title,
        description,
        projectId,
        assignedToId,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
      req.user!
    );
    return sendSuccess(res, task, 'Task created successfully', 201);
  } catch (error: any) {
    if (error.message === 'PROJECT_NOT_FOUND') {
      return sendError(res, 'Associated project not found', 404, 'NOT_FOUND');
    }
    if (error.message === 'FORBIDDEN_NOT_PROJECT_OWNER') {
      return sendError(res, 'You can only create tasks for projects you manage', 403, 'FORBIDDEN');
    }
    if (error.message === 'INVALID_DEVELOPER_ASSIGNMENT') {
      return sendError(res, 'Assigned user must be a Developer', 422, 'INVALID_ASSIGNMENT');
    }
    next(error);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;
    const updated = await taskService.updateTaskStatus(id, status, req.user!);
    return sendSuccess(res, updated, 'Task status updated');
  } catch (error: any) {
    if (error.message === 'TASK_NOT_FOUND') {
      return sendError(res, 'Task not found', 404, 'NOT_FOUND');
    }
    if (error.message === 'FORBIDDEN_TASK_ACCESS') {
      return sendError(res, 'Developers can only update status of tasks assigned to them', 403, 'FORBIDDEN');
    }
    if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
      return sendError(res, 'You do not have permission to update tasks in another PM\'s project', 403, 'FORBIDDEN');
    }
    next(error);
  }
};

export const updateDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { title, description, assignedToId, priority, dueDate } = req.body;
    const updated = await taskService.updateTaskDetails(
      id,
      {
        title,
        description,
        assignedToId,
        priority,
        dueDate: dueDate ? new Date(dueDate) : dueDate === null ? null : undefined,
      },
      req.user!
    );
    return sendSuccess(res, updated, 'Task details updated');
  } catch (error: any) {
    if (error.message === 'FORBIDDEN_FULL_EDIT_DEVELOPER') {
      return sendError(res, 'Developers cannot modify task metadata. You can only update task status.', 403, 'FORBIDDEN');
    }
    if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
      return sendError(res, 'You can only modify tasks for your own projects', 403, 'FORBIDDEN');
    }
    if (error.message === 'TASK_NOT_FOUND') {
      return sendError(res, 'Task not found', 404, 'NOT_FOUND');
    }
    next(error);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    await taskService.deleteTask(id, req.user!);
    return sendSuccess(res, null, 'Task deleted successfully');
  } catch (error: any) {
    if (error.message === 'FORBIDDEN_DELETE') {
      return sendError(res, 'Developers cannot delete tasks', 403, 'FORBIDDEN');
    }
    if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
      return sendError(res, 'You can only delete tasks from your own projects', 403, 'FORBIDDEN');
    }
    if (error.message === 'TASK_NOT_FOUND') {
      return sendError(res, 'Task not found', 404, 'NOT_FOUND');
    }
    next(error);
  }
};
