import { Router } from 'express';
import { Role } from '@prisma/client';
import { inventoryController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  inventoryQuerySchema,
  movementQuerySchema,
  stockMovementSchema,
} from '../validators';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(Role.ADMIN, Role.WAREHOUSE, Role.SALES, Role.ACCOUNTS),
  validate(inventoryQuerySchema, 'query'),
  inventoryController.getInventory
);

router.get(
  '/movements',
  authorize(Role.ADMIN, Role.WAREHOUSE),
  validate(movementQuerySchema, 'query'),
  inventoryController.getMovements
);

router.post(
  '/movements',
  authorize(Role.ADMIN, Role.WAREHOUSE),
  validate(stockMovementSchema),
  inventoryController.createMovement
);

export default router;
