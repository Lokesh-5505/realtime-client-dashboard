import { prisma } from '../config/database';
import { sendLiveNotification } from '../sockets/socketHandler';

export const createNotification = async (data: {
  userId: string;
  title: string;
  message: string;
  link?: string;
}) => {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      title: data.title,
      message: data.message,
      link: data.link,
    },
  });

  // Push real-time notification to the user's socket room
  sendLiveNotification(data.userId, notification);

  return notification;
};

export const getUserNotifications = async (userId: string, limit = 20) => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return { notifications, unreadCount };
};

export const markNotificationAsRead = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return { success: notification.count > 0, unreadCount };
};

export const markAllNotificationsAsRead = async (userId: string) => {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  return { success: true, unreadCount: 0 };
};
