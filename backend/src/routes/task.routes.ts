import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import { authenticate } from '../middleware/auth';
import { requireAdminOrPM } from '../middleware/rbac';
import { validateBody, validateQuery } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', validateQuery(taskController.listTasksQuerySchema), taskController.listTasks);
router.get('/:id', taskController.getTask);

// Create task: Admin & PM only
router.post(
  '/',
  requireAdminOrPM,
  validateBody(taskController.createTaskSchema),
  taskController.createTask
);

// Update status: Developers (for assigned tasks), PMs, and Admins
router.patch(
  '/:id/status',
  validateBody(taskController.updateTaskStatusSchema),
  taskController.updateStatus
);

// Update details: Admin & PM only
router.patch(
  '/:id',
  requireAdminOrPM,
  validateBody(taskController.updateTaskDetailsSchema),
  taskController.updateDetails
);

// Delete task: Admin & PM only
router.delete('/:id', requireAdminOrPM, taskController.deleteTask);

export default router;
