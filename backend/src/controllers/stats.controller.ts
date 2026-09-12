import { Request, Response, NextFunction } from 'express';
import * as statsService from '../services/statsService';
import { sendSuccess } from '../utils/response';

export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await statsService.getDashboardStats(req.user!);
    return sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
};
