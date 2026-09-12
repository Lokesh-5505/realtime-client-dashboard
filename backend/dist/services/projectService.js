"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProject = exports.createProject = exports.getProjectById = exports.getProjects = void 0;
const database_1 = require("../config/database");
const client_1 = require("@prisma/client");
const activityService_1 = require("./activityService");
const getProjects = async (user) => {
    const where = {};
    if (user.role === client_1.Role.ADMIN) {
        // Admin sees all projects
    }
    else if (user.role === client_1.Role.PROJECT_MANAGER) {
        // PM sees only their own projects
        where.managerId = user.id;
    }
    else if (user.role === client_1.Role.DEVELOPER) {
        // Dev only sees projects where they have assigned tasks
        where.tasks = {
            some: {
                assignedToId: user.id,
            },
        };
    }
    return database_1.prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            client: {
                select: { id: true, name: true, company: true, email: true },
            },
            manager: {
                select: { id: true, name: true, email: true, avatarUrl: true },
            },
            _count: {
                select: {
                    tasks: true,
                },
            },
        },
    });
};
exports.getProjects = getProjects;
const getProjectById = async (projectId, user) => {
    const project = await database_1.prisma.project.findUnique({
        where: { id: projectId },
        include: {
            client: true,
            manager: {
                select: { id: true, name: true, email: true, avatarUrl: true },
            },
            tasks: {
                where: user.role === client_1.Role.DEVELOPER ? { assignedToId: user.id } : undefined,
                include: {
                    assignedTo: {
                        select: { id: true, name: true, email: true, avatarUrl: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            },
        },
    });
    if (!project) {
        return null;
    }
    // Access check
    if (user.role === client_1.Role.PROJECT_MANAGER && project.managerId !== user.id) {
        throw new Error('FORBIDDEN_PROJECT_ACCESS');
    }
    if (user.role === client_1.Role.DEVELOPER) {
        const hasTask = project.tasks.length > 0;
        if (!hasTask) {
            throw new Error('FORBIDDEN_PROJECT_ACCESS');
        }
    }
    return project;
};
exports.getProjectById = getProjectById;
const createProject = async (data, user) => {
    if (user.role === client_1.Role.DEVELOPER) {
        throw new Error('FORBIDDEN_CREATE_PROJECT');
    }
    // Ensure client exists
    const client = await database_1.prisma.client.findUnique({
        where: { id: data.clientId },
    });
    if (!client) {
        throw new Error('CLIENT_NOT_FOUND');
    }
    // If PM creates, manager is always the PM
    const managerId = user.role === client_1.Role.PROJECT_MANAGER ? user.id : data.managerId || user.id;
    const project = await database_1.prisma.project.create({
        data: {
            name: data.name,
            description: data.description,
            clientId: data.clientId,
            managerId,
            status: data.status || client_1.ProjectStatus.ACTIVE,
        },
        include: {
            client: true,
            manager: {
                select: { id: true, name: true, email: true },
            },
        },
    });
    await (0, activityService_1.createActivityLog)({
        projectId: project.id,
        userId: user.id,
        action: 'PROJECT_CREATED',
        message: `${user.name} created new project "${project.name}" for client ${client.name}`,
        managerId: project.managerId,
    });
    return project;
};
exports.createProject = createProject;
const updateProject = async (projectId, data, user) => {
    const project = await database_1.prisma.project.findUnique({
        where: { id: projectId },
    });
    if (!project) {
        throw new Error('PROJECT_NOT_FOUND');
    }
    if (user.role === client_1.Role.PROJECT_MANAGER && project.managerId !== user.id) {
        throw new Error('FORBIDDEN_PROJECT_ACCESS');
    }
    return database_1.prisma.project.update({
        where: { id: projectId },
        data,
        include: {
            client: true,
            manager: {
                select: { id: true, name: true, email: true },
            },
        },
    });
};
exports.updateProject = updateProject;
