import { Router } from 'express';
import * as projectController from '../controllers/project.controller';
import { authenticate } from '../middleware/auth';
import { requireAdminOrPM } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', projectController.listProjects);
router.get('/:id', projectController.getProject);
router.post(
  '/',
  requireAdminOrPM,
  validateBody(projectController.createProjectSchema),
  projectController.createProject
);
router.patch(
  '/:id',
  requireAdminOrPM,
  validateBody(projectController.updateProjectSchema),
  projectController.updateProject
);

export default router;
