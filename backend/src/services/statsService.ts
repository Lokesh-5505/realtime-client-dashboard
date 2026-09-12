import { prisma } from '../config/database';
import { Role, TaskStatus, Priority } from '@prisma/client';
import { getOnlineUserStats } from '../sockets/socketHandler';

export const getDashboardStats = async (user: { id: string; role: Role }) => {
  const onlineStats = getOnlineUserStats();

  if (user.role === Role.ADMIN) {
    // Admin metrics: total projects, total tasks by status, overdue count, active online users
    const [totalProjects, totalClients, tasksByStatus, overdueCount, totalTasks] = await Promise.all([
      prisma.project.count(),
      prisma.client.count(),
      prisma.task.groupBy({
        by: ['status'],
        _count: {
          _all: true,
        },
      }),
      prisma.task.count({
        where: {
          isOverdue: true,
          status: { not: TaskStatus.DONE },
        },
      }),
      prisma.task.count(),
    ]);

    const statusMap = {
      TODO: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      DONE: 0,
    };
    tasksByStatus.forEach((item) => {
      statusMap[item.status] = item._count._all;
    });

    return {
      role: Role.ADMIN,
      totalProjects,
      totalClients,
      totalTasks,
      tasksByStatus: statusMap,
      overdueCount,
      onlineUsersCount: onlineStats.count,
    };
  }

  if (user.role === Role.PROJECT_MANAGER) {
    // PM metrics: their projects summary, tasks by priority, upcoming due dates this week
    const now = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(now.getDate() + 7);

    const [managedProjects, tasksByPriority, upcomingTasks, overdueCount] = await Promise.all([
      prisma.project.findMany({
        where: { managerId: user.id },
        include: {
          client: { select: { name: true, company: true } },
          _count: { select: { tasks: true } },
        },
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where: {
          project: { managerId: user.id },
        },
        _count: { _all: true },
      }),
      prisma.task.findMany({
        where: {
          project: { managerId: user.id },
          dueDate: {
            gte: now,
            lte: oneWeekFromNow,
          },
          status: { not: TaskStatus.DONE },
        },
        orderBy: { dueDate: 'asc' },
        include: {
          project: { select: { name: true } },
          assignedTo: { select: { name: true } },
        },
        take: 10,
      }),
      prisma.task.count({
        where: {
          project: { managerId: user.id },
          isOverdue: true,
          status: { not: TaskStatus.DONE },
        },
      }),
    ]);

    const priorityMap = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    tasksByPriority.forEach((p) => {
      priorityMap[p.priority] = p._count._all;
    });

    return {
      role: Role.PROJECT_MANAGER,
      managedProjects,
      totalManagedProjects: managedProjects.length,
      tasksByPriority: priorityMap,
      upcomingTasksThisWeek: upcomingTasks,
      overdueCount,
      onlineUsersCount: onlineStats.count,
    };
  }

  // Developer metrics: their assigned tasks counts, upcoming due dates, tasks by status
  const [assignedTasksCount, tasksByStatus, overdueCount, upcomingTasks] = await Promise.all([
    prisma.task.count({ where: { assignedToId: user.id } }),
    prisma.task.groupBy({
      by: ['status'],
      where: { assignedToId: user.id },
      _count: { _all: true },
    }),
    prisma.task.count({
      where: {
        assignedToId: user.id,
        isOverdue: true,
        status: { not: TaskStatus.DONE },
      },
    }),
    prisma.task.findMany({
      where: {
        assignedToId: user.id,
        status: { not: TaskStatus.DONE },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      include: {
        project: { select: { name: true } },
      },
      take: 5,
    }),
  ]);

  const devStatusMap = {
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };
  tasksByStatus.forEach((s) => {
    devStatusMap[s.status] = s._count._all;
  });

  return {
    role: Role.DEVELOPER,
    assignedTasksCount,
    tasksByStatus: devStatusMap,
    overdueCount,
    priorityTasks: upcomingTasks,
    onlineUsersCount: onlineStats.count,
  };
};
