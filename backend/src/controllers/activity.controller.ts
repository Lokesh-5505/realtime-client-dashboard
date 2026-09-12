import { Request, Response, NextFunction } from 'express';
import * as activityService from '../services/activityService';
import { sendSuccess } from '../utils/response';

export const getActivityFeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const since = req.query.since ? new Date(req.query.since as string) : undefined;

    const activities = await activityService.getRoleFilteredActivityFeed(
      req.user!,
      limit,
      since
    );

    return sendSuccess(res, activities);
  } catch (error) {
    next(error);
  }
};
