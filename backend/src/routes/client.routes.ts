import { Router } from 'express';
import * as clientController from '../controllers/client.controller';
import { authenticate } from '../middleware/auth';
import { requireAdminOrPM } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/', clientController.listClients);
router.post('/', requireAdminOrPM, validateBody(clientController.createClientSchema), clientController.createClient);

export default router;
