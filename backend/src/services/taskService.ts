import { prisma } from '../config/database';
import { Role, TaskStatus, Priority } from '@prisma/client';
import { createActivityLog } from './activityService';
import { createNotification } from './notificationService';
import { broadcastTaskChange } from '../sockets/socketHandler';

export interface TaskFilterOptions {
  status?: TaskStatus;
  priority?: Priority;
  dueFrom?: Date;
  dueTo?: Date;
  search?: string;
  projectId?: string;
}

export const getTasks = async (user: { id: string; role: Role }, filters: TaskFilterOptions) => {
  const where: any = {};

  // Role scoping
  if (user.role === Role.ADMIN) {
    if (filters.projectId) {
      where.projectId = filters.projectId;
    }
  } else if (user.role === Role.PROJECT_MANAGER) {
    // PM can only view tasks from projects they manage
    where.project = {
      managerId: user.id,
    };
    if (filters.projectId) {
      where.projectId = filters.projectId;
    }
  } else if (user.role === Role.DEVELOPER) {
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
    if (filters.dueFrom) where.dueDate.gte = filters.dueFrom;
    if (filters.dueTo) where.dueDate.lte = filters.dueTo;
  }
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // Developers sort by priority (CRITICAL -> LOW) then dueDate
  const orderBy: any =
    user.role === Role.DEVELOPER
      ? [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }]
      : [{ createdAt: 'desc' }];

  return prisma.task.findMany({
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

export const getTaskById = async (taskId: string, user: { id: string; role: Role }) => {
  const task = await prisma.task.findUnique({
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
  if (user.role === Role.PROJECT_MANAGER && task.project.managerId !== user.id) {
    throw new Error('FORBIDDEN_PROJECT_ACCESS');
  }
  if (user.role === Role.DEVELOPER && task.assignedToId !== user.id) {
    throw new Error('FORBIDDEN_TASK_ACCESS');
  }

  return task;
};

export const createTask = async (
  data: {
    title: string;
    description?: string;
    projectId: string;
    assignedToId?: string;
    priority?: Priority;
    dueDate?: Date;
  },
  user: { id: string; name: string; role: Role }
) => {
  // Verify project existence and PM ownership
  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
  });

  if (!project) {
    throw new Error('PROJECT_NOT_FOUND');
  }

  if (user.role === Role.PROJECT_MANAGER && project.managerId !== user.id) {
    throw new Error('FORBIDDEN_NOT_PROJECT_OWNER');
  }

  // Check if assignedTo is a developer
  if (data.assignedToId) {
    const dev = await prisma.user.findUnique({
      where: { id: data.assignedToId },
    });
    if (!dev || dev.role !== Role.DEVELOPER) {
      throw new Error('INVALID_DEVELOPER_ASSIGNMENT');
    }
  }

  const isOverdue = data.dueDate ? new Date(data.dueDate) < new Date() : false;

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      assignedToId: data.assignedToId,
      priority: data.priority || Priority.MEDIUM,
      dueDate: data.dueDate,
      isOverdue,
      status: TaskStatus.TODO,
    },
    include: {
      project: true,
      assignedTo: true,
    },
  });

  // Create activity log
  await createActivityLog({
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
    await createNotification({
      userId: task.assignedToId,
      title: 'New Task Assigned',
      message: `${user.name} assigned you Task #${task.taskNumber}: "${task.title}" in project "${project.name}"`,
      link: `/tasks?projectId=${project.id}`,
    });
  }

  broadcastTaskChange(task.projectId, task);

  return task;
};

export const updateTaskStatus = async (
  taskId: string,
  newStatus: TaskStatus,
  user: { id: string; name: string; role: Role }
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true, assignedTo: true },
  });

  if (!task) {
    throw new Error('TASK_NOT_FOUND');
  }

  // RBAC checks
  if (user.role === Role.DEVELOPER && task.assignedToId !== user.id) {
    throw new Error('FORBIDDEN_TASK_ACCESS');
  }
  if (user.role === Role.PROJECT_MANAGER && task.project.managerId !== user.id) {
    throw new Error('FORBIDDEN_PROJECT_ACCESS');
  }

  const prevStatus = task.status;
  if (prevStatus === newStatus) {
    return task;
  }

  const formatStatus = (s: TaskStatus) => {
    switch (s) {
      case TaskStatus.TODO:
        return 'To Do';
      case TaskStatus.IN_PROGRESS:
        return 'In Progress';
      case TaskStatus.IN_REVIEW:
        return 'In Review';
      case TaskStatus.DONE:
        return 'Done';
      default:
        return s;
    }
  };

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { status: newStatus },
    include: { project: true, assignedTo: true },
  });

  // Human-readable status change formatting:
  // "Ravi moved Task #12 from In Progress → In Review"
  const message = `${user.name} moved Task #${task.taskNumber} from ${formatStatus(prevStatus)} → ${formatStatus(newStatus)}`;

  await createActivityLog({
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
  if (newStatus === TaskStatus.IN_REVIEW && task.project.managerId) {
    await createNotification({
      userId: task.project.managerId,
      title: 'Task Ready for Review',
      message: `${user.name} moved Task #${task.taskNumber} ("${task.title}") to In Review`,
      link: `/tasks?projectId=${task.projectId}`,
    });
  }

  broadcastTaskChange(task.projectId, updatedTask);

  return updatedTask;
};

export const updateTaskDetails = async (
  taskId: string,
  data: {
    title?: string;
    description?: string;
    assignedToId?: string | null;
    priority?: Priority;
    dueDate?: Date | null;
  },
  user: { id: string; name: string; role: Role }
) => {
  // Only Admin or PM can edit full details
  if (user.role === Role.DEVELOPER) {
    throw new Error('FORBIDDEN_FULL_EDIT_DEVELOPER');
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) {
    throw new Error('TASK_NOT_FOUND');
  }

  if (user.role === Role.PROJECT_MANAGER && task.project.managerId !== user.id) {
    throw new Error('FORBIDDEN_PROJECT_ACCESS');
  }

  const previousAssignedId = task.assignedToId;

  const isOverdue = data.dueDate
    ? new Date(data.dueDate) < new Date() && task.status !== TaskStatus.DONE
    : data.dueDate === null
    ? false
    : task.isOverdue;

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...data,
      isOverdue,
    },
    include: { project: true, assignedTo: true },
  });

  // If newly assigned or reassigned to a developer
  if (data.assignedToId && data.assignedToId !== previousAssignedId) {
    await createNotification({
      userId: data.assignedToId,
      title: 'Task Assigned',
      message: `${user.name} assigned you Task #${updatedTask.taskNumber}: "${updatedTask.title}"`,
      link: `/tasks?projectId=${task.projectId}`,
    });

    await createActivityLog({
      projectId: task.projectId,
      taskId: task.id,
      userId: user.id,
      action: 'TASK_ASSIGNED',
      message: `${user.name} assigned Task #${updatedTask.taskNumber} to ${updatedTask.assignedTo?.name || 'Developer'}`,
      assignedToId: updatedTask.assignedToId,
      managerId: task.project.managerId,
    });
  }

  broadcastTaskChange(task.projectId, updatedTask);

  return updatedTask;
};

export const deleteTask = async (taskId: string, user: { id: string; name: string; role: Role }) => {
  if (user.role === Role.DEVELOPER) {
    throw new Error('FORBIDDEN_DELETE');
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) {
    throw new Error('TASK_NOT_FOUND');
  }

  if (user.role === Role.PROJECT_MANAGER && task.project.managerId !== user.id) {
    throw new Error('FORBIDDEN_PROJECT_ACCESS');
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  return { success: true };
};
