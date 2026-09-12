import { prisma } from '../config/database';
import { Role, ProjectStatus } from '@prisma/client';
import { createActivityLog } from './activityService';

export const getProjects = async (user: { id: string; role: Role }) => {
  const where: any = {};

  if (user.role === Role.ADMIN) {
    // Admin sees all projects
  } else if (user.role === Role.PROJECT_MANAGER) {
    // PM sees only their own projects
    where.managerId = user.id;
  } else if (user.role === Role.DEVELOPER) {
    // Dev only sees projects where they have assigned tasks
    where.tasks = {
      some: {
        assignedToId: user.id,
      },
    };
  }

  return prisma.project.findMany({
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

export const getProjectById = async (projectId: string, user: { id: string; role: Role }) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      manager: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
      tasks: {
        where: user.role === Role.DEVELOPER ? { assignedToId: user.id } : undefined,
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
  if (user.role === Role.PROJECT_MANAGER && project.managerId !== user.id) {
    throw new Error('FORBIDDEN_PROJECT_ACCESS');
  }

  if (user.role === Role.DEVELOPER) {
    const hasTask = project.tasks.length > 0;
    if (!hasTask) {
      throw new Error('FORBIDDEN_PROJECT_ACCESS');
    }
  }

  return project;
};

export const createProject = async (
  data: {
    name: string;
    description?: string;
    clientId: string;
    managerId?: string;
    status?: ProjectStatus;
  },
  user: { id: string; name: string; role: Role }
) => {
  if (user.role === Role.DEVELOPER) {
    throw new Error('FORBIDDEN_CREATE_PROJECT');
  }

  // Ensure client exists
  const client = await prisma.client.findUnique({
    where: { id: data.clientId },
  });

  if (!client) {
    throw new Error('CLIENT_NOT_FOUND');
  }

  // If PM creates, manager is always the PM
  const managerId = user.role === Role.PROJECT_MANAGER ? user.id : data.managerId || user.id;

  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      clientId: data.clientId,
      managerId,
      status: data.status || ProjectStatus.ACTIVE,
    },
    include: {
      client: true,
      manager: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  await createActivityLog({
    projectId: project.id,
    userId: user.id,
    action: 'PROJECT_CREATED',
    message: `${user.name} created new project "${project.name}" for client ${client.name}`,
    managerId: project.managerId,
  });

  return project;
};

export const updateProject = async (
  projectId: string,
  data: {
    name?: string;
    description?: string;
    status?: ProjectStatus;
    clientId?: string;
  },
  user: { id: string; role: Role }
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND');
  }

  if (user.role === Role.PROJECT_MANAGER && project.managerId !== user.id) {
    throw new Error('FORBIDDEN_PROJECT_ACCESS');
  }

  return prisma.project.update({
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
