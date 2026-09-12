import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notificationService';
import { sendSuccess } from '../utils/response';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const data = await notificationService.getUserNotifications(req.user!.id, limit);
    return sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const result = await notificationService.markNotificationAsRead(id, req.user!.id);
    return sendSuccess(res, result, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await notificationService.markAllNotificationsAsRead(req.user!.id);
    return sendSuccess(res, result, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};
