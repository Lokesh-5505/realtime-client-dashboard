import { Router, Request, Response, NextFunction } from 'express';
import { checkOverdueTasks } from '../jobs/overdueScheduler';
import { sendSuccess } from '../utils/response';

const router = Router();

/**
 * GET /api/cron/overdue
 * Can be triggered by Vercel Cron, GitHub Actions, cron-job.org, or external HTTP schedulers.
 * Optional secret check via CRON_SECRET header or query parameter if configured.
 */
router.get('/overdue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.authorization;
      const querySecret = req.query.secret;
      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;

      if (!isAuthorized) {
        return res.status(401).json({ success: false, error: 'Unauthorized cron request' });
      }
    }

    const flaggedCount = await checkOverdueTasks();
    return sendSuccess(res, {
      flaggedCount,
      timestamp: new Date().toISOString(),
    }, `Overdue task scheduler executed. Flagged ${flaggedCount} task(s).`);
  } catch (error) {
    next(error);
  }
});

export default router;
