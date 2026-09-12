"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const overdueScheduler_1 = require("../jobs/overdueScheduler");
const response_1 = require("../utils/response");
const router = (0, express_1.Router)();
/**
 * GET /api/cron/overdue
 * Can be triggered by Vercel Cron, GitHub Actions, cron-job.org, or external HTTP schedulers.
 * Optional secret check via CRON_SECRET header or query parameter if configured.
 */
router.get('/overdue', async (req, res, next) => {
    try {
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret) {
            const authHeader = req.headers.authorization;
            const querySecret = req.query.secret;
            const isAuthorized = authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;
            if (!isAuthorized) {
                return res.status(401).json({ success: false, error: 'Unauthorized cron request' });
            }
        }
        const flaggedCount = await (0, overdueScheduler_1.checkOverdueTasks)();
        return (0, response_1.sendSuccess)(res, {
            flaggedCount,
            timestamp: new Date().toISOString(),
        }, `Overdue task scheduler executed. Flagged ${flaggedCount} task(s).`);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
