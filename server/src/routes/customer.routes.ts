import { Router } from 'express';
import { Role } from '@prisma/client';
import { customerController } from '../controllers/customer.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  customerSchema,
  customerUpdateSchema,
  customerQuerySchema,
} from '../validators';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  validate(customerQuerySchema, 'query'),
  customerController.getAll
);

router.get(
  '/:id',
  authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  customerController.getById
);

router.post(
  '/',
  authorize(Role.ADMIN, Role.SALES),
  validate(customerSchema),
  customerController.create
);

router.put(
  '/:id',
  authorize(Role.ADMIN, Role.SALES),
  validate(customerUpdateSchema),
  customerController.update
);

router.delete('/:id', authorize(Role.ADMIN, Role.SALES), customerController.delete);

export default router;
