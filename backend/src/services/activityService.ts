import { prisma } from '../config/database';
import { Role } from '@prisma/client';
import { broadcastActivityEvent } from '../sockets/socketHandler';

export interface CreateActivityInput {
  projectId: string;
  taskId?: string;
  userId: string;
  action: string;
  previousState?: string;
  newState?: string;
  message: string;
  assignedToId?: string | null;
  managerId?: string | null;
}

export const createActivityLog = async (input: CreateActivityInput) => {
  const log = await prisma.activityLog.create({
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
  broadcastActivityEvent({
    activity: log,
    projectId: input.projectId,
    assignedToId: input.assignedToId || log.task?.assignedToId,
    managerId: input.managerId || log.project?.managerId,
  });

  return log;
};

export const getRoleFilteredActivityFeed = async (user: { id: string; role: Role }, limit = 20, since?: Date) => {
  const whereClause: any = {};

  if (since) {
    whereClause.createdAt = { gt: since };
  }

  if (user.role === Role.ADMIN) {
    // Admin sees all activity across all projects
  } else if (user.role === Role.PROJECT_MANAGER) {
    // PM sees activity only from their own projects
    whereClause.project = {
      managerId: user.id,
    };
  } else if (user.role === Role.DEVELOPER) {
    // Developer sees activity only on tasks assigned to them
    whereClause.task = {
      assignedToId: user.id,
    };
  }

  return prisma.activityLog.findMany({
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
