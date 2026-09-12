import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as projectService from '../services/projectService';
import { sendSuccess, sendError } from '../utils/response';
import { ProjectStatus } from '@prisma/client';

export const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  clientId: z.string().uuid(),
  status: z.nativeEnum(ProjectStatus).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  clientId: z.string().uuid().optional(),
});

export const listProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await projectService.getProjects(req.user!);
    return sendSuccess(res, projects);
  } catch (error) {
    next(error);
  }
};

export const getProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const project = await projectService.getProjectById(id, req.user!);
    if (!project) {
      return sendError(res, 'Project not found', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, project);
  } catch (error: any) {
    if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
      return sendError(res, 'You do not have permission to view this project', 403, 'FORBIDDEN');
    }
    next(error);
  }
};

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.createProject(req.body, req.user!);
    return sendSuccess(res, project, 'Project created successfully', 201);
  } catch (error: any) {
    if (error.message === 'CLIENT_NOT_FOUND') {
      return sendError(res, 'Specified client does not exist', 404, 'CLIENT_NOT_FOUND');
    }
    if (error.message === 'FORBIDDEN_CREATE_PROJECT') {
      return sendError(res, 'Only Administrators and Project Managers can create projects', 403, 'FORBIDDEN');
    }
    next(error);
  }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const project = await projectService.updateProject(id, req.body, req.user!);
    return sendSuccess(res, project, 'Project updated successfully');
  } catch (error: any) {
    if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
      return sendError(res, 'You cannot edit another Project Manager\'s project', 403, 'FORBIDDEN');
    }
    if (error.message === 'PROJECT_NOT_FOUND') {
      return sendError(res, 'Project not found', 404, 'NOT_FOUND');
    }
    next(error);
  }
};
