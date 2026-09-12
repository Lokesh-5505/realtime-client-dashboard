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
exports.updateProject = exports.createProject = exports.getProject = exports.listProjects = exports.updateProjectSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
const projectService = __importStar(require("../services/projectService"));
const response_1 = require("../utils/response");
const client_1 = require("@prisma/client");
exports.createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    description: zod_1.z.string().optional(),
    clientId: zod_1.z.string().uuid(),
    status: zod_1.z.nativeEnum(client_1.ProjectStatus).optional(),
});
exports.updateProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    description: zod_1.z.string().optional(),
    status: zod_1.z.nativeEnum(client_1.ProjectStatus).optional(),
    clientId: zod_1.z.string().uuid().optional(),
});
const listProjects = async (req, res, next) => {
    try {
        const projects = await projectService.getProjects(req.user);
        return (0, response_1.sendSuccess)(res, projects);
    }
    catch (error) {
        next(error);
    }
};
exports.listProjects = listProjects;
const getProject = async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const project = await projectService.getProjectById(id, req.user);
        if (!project) {
            return (0, response_1.sendError)(res, 'Project not found', 404, 'NOT_FOUND');
        }
        return (0, response_1.sendSuccess)(res, project);
    }
    catch (error) {
        if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
            return (0, response_1.sendError)(res, 'You do not have permission to view this project', 403, 'FORBIDDEN');
        }
        next(error);
    }
};
exports.getProject = getProject;
const createProject = async (req, res, next) => {
    try {
        const project = await projectService.createProject(req.body, req.user);
        return (0, response_1.sendSuccess)(res, project, 'Project created successfully', 201);
    }
    catch (error) {
        if (error.message === 'CLIENT_NOT_FOUND') {
            return (0, response_1.sendError)(res, 'Specified client does not exist', 404, 'CLIENT_NOT_FOUND');
        }
        if (error.message === 'FORBIDDEN_CREATE_PROJECT') {
            return (0, response_1.sendError)(res, 'Only Administrators and Project Managers can create projects', 403, 'FORBIDDEN');
        }
        next(error);
    }
};
exports.createProject = createProject;
const updateProject = async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const project = await projectService.updateProject(id, req.body, req.user);
        return (0, response_1.sendSuccess)(res, project, 'Project updated successfully');
    }
    catch (error) {
        if (error.message === 'FORBIDDEN_PROJECT_ACCESS') {
            return (0, response_1.sendError)(res, 'You cannot edit another Project Manager\'s project', 403, 'FORBIDDEN');
        }
        if (error.message === 'PROJECT_NOT_FOUND') {
            return (0, response_1.sendError)(res, 'Project not found', 404, 'NOT_FOUND');
        }
        next(error);
    }
};
exports.updateProject = updateProject;
