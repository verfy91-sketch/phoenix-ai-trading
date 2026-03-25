import { Router } from 'express';
import { register, login, logout, refreshToken, getMe, updateMe } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validator';
import { z } from 'zod';

const router = Router();

// Public routes
router.post('/register', register);

router.post('/login', login);

router.post('/logout', logout);
router.post('/refresh', refreshToken);

// Protected routes
router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, validateRequest(z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})), updateMe);

export default router;
