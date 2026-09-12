import { Router } from 'express';
import * as activityController from '../controllers/activity.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Role-filtered activity feed with missed events catchup (limit, since)
router.get('/feed', activityController.getActivityFeed);

export default router;
