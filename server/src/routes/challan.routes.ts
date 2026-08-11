import { Router } from 'express';
import { Role } from '@prisma/client';
import { challanController, dashboardController } from '../controllers/challan.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { challanSchema, challanQuerySchema } from '../validators';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  validate(challanQuerySchema, 'query'),
  challanController.getAll
);

router.get(
  '/:id',
  authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  challanController.getById
);

router.post(
  '/',
  authorize(Role.ADMIN, Role.SALES),
  validate(challanSchema),
  challanController.create
);

router.post(
  '/:id/confirm',
  authorize(Role.ADMIN, Role.SALES),
  challanController.confirm
);

router.post(
  '/:id/cancel',
  authorize(Role.ADMIN, Role.SALES),
  challanController.cancel
);

export default router;

const dashboardRouter = Router();
dashboardRouter.use(authenticate);
dashboardRouter.get('/', authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), dashboardController.getStats);

export { dashboardRouter };
