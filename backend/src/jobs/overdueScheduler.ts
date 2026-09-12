import cron from 'node-cron';
import { prisma } from '../config/database';
import { TaskStatus } from '@prisma/client';
import { createActivityLog } from '../services/activityService';
import { createNotification } from '../services/notificationService';
import { broadcastTaskChange } from '../sockets/socketHandler';

export const checkOverdueTasks = async () => {
  const now = new Date();

  try {
    // Find all tasks that have passed due date, are not done, and not yet flagged as overdue
    const tasksToFlag = await prisma.task.findMany({
      where: {
        dueDate: {
          lt: now,
        },
        status: {
          not: TaskStatus.DONE,
        },
        isOverdue: false,
      },
      include: {
        project: {
          select: { id: true, name: true, managerId: true },
        },
        assignedTo: {
          select: { id: true, name: true },
        },
      },
    });

    if (tasksToFlag.length === 0) {
      return 0;
    }

    console.log(`[Overdue Cron Job] Detected ${tasksToFlag.length} overdue task(s). Flagging...`);

    for (const task of tasksToFlag) {
      // Mark overdue in DB
      const updated = await prisma.task.update({
        where: { id: task.id },
        data: { isOverdue: true },
        include: {
          project: true,
          assignedTo: true,
        },
      });

      // System activity log
      await createActivityLog({
        projectId: task.projectId,
        taskId: task.id,
        userId: task.project.managerId, // Attribute or link to project context
        action: 'TASK_OVERDUE',
        message: `Task #${task.taskNumber} ("${task.title}") flagged as Overdue by System Scheduler`,
        assignedToId: task.assignedToId,
        managerId: task.project.managerId,
      });

      // Notify assigned developer
      if (task.assignedToId) {
        await createNotification({
          userId: task.assignedToId,
          title: 'Task Overdue Alert',
          message: `Task #${task.taskNumber} ("${task.title}") has passed its due date and is now Overdue`,
          link: `/tasks?projectId=${task.projectId}`,
        });
      }

      // Notify project manager
      if (task.project.managerId) {
        await createNotification({
          userId: task.project.managerId,
          title: 'Project Task Overdue',
          message: `Task #${task.taskNumber} in project "${task.project.name}" is now Overdue`,
          link: `/tasks?projectId=${task.projectId}`,
        });
      }

      broadcastTaskChange(task.projectId, updated);
    }

    return tasksToFlag.length;
  } catch (error) {
    console.error('[Overdue Cron Job Error]:', error);
    return 0;
  }
};

export const startOverdueScheduler = () => {
  console.log('[Scheduler] Initializing Overdue Task background scheduler (node-cron)...');

  // Run initial check on startup
  checkOverdueTasks();

  // Schedule to run every minute
  const task = cron.schedule('* * * * *', async () => {
    await checkOverdueTasks();
  });

  return task;
};
