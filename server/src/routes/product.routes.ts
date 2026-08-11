import { Router } from 'express';
import { Role } from '@prisma/client';
import { productController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { productSchema, productUpdateSchema, productQuerySchema } from '../validators';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  validate(productQuerySchema, 'query'),
  productController.getAll
);

router.get(
  '/:id',
  authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  productController.getById
);

router.post(
  '/',
  authorize(Role.ADMIN, Role.WAREHOUSE),
  validate(productSchema),
  productController.create
);

router.put(
  '/:id',
  authorize(Role.ADMIN, Role.WAREHOUSE),
  validate(productUpdateSchema),
  productController.update
);

export default router;
