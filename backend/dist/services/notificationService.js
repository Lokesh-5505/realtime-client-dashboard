"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getUserNotifications = exports.createNotification = void 0;
const database_1 = require("../config/database");
const socketHandler_1 = require("../sockets/socketHandler");
const createNotification = async (data) => {
    const notification = await database_1.prisma.notification.create({
        data: {
            userId: data.userId,
            title: data.title,
            message: data.message,
            link: data.link,
        },
    });
    // Push real-time notification to the user's socket room
    (0, socketHandler_1.sendLiveNotification)(data.userId, notification);
    return notification;
};
exports.createNotification = createNotification;
const getUserNotifications = async (userId, limit = 20) => {
    const [notifications, unreadCount] = await Promise.all([
        database_1.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        }),
        database_1.prisma.notification.count({
            where: { userId, isRead: false },
        }),
    ]);
    return { notifications, unreadCount };
};
exports.getUserNotifications = getUserNotifications;
const markNotificationAsRead = async (notificationId, userId) => {
    const notification = await database_1.prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true },
    });
    const unreadCount = await database_1.prisma.notification.count({
        where: { userId, isRead: false },
    });
    return { success: notification.count > 0, unreadCount };
};
exports.markNotificationAsRead = markNotificationAsRead;
const markAllNotificationsAsRead = async (userId) => {
    await database_1.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    });
    return { success: true, unreadCount: 0 };
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
