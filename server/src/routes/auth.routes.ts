import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { loginSchema } from '../validators';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);

export default router;
