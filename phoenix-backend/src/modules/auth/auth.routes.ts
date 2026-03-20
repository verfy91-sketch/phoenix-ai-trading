import { Router } from 'express';
import { register, login, logout, refreshToken, getMe, updateMe } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validator';
import { z } from 'zod';

const router = Router();

// Public routes
router.post('/register', validateRequest(z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
})), register);

router.post('/login', validateRequest(z.object({
  email: z.string().email(),
  password: z.string().min(1),
})), login);

router.post('/logout', logout);
router.post('/refresh', refreshToken);

// Protected routes
router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, validateRequest(z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})), updateMe);

export default router;
