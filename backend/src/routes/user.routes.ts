import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireAdminOrPM } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

// PMs and Admins can list developers for task assignment
router.get('/developers', requireAdminOrPM, userController.listDevelopers);

// Admins can list all users
router.get('/all', requireAdmin, userController.listAllUsers);

export default router;
