import { Router } from 'express';
import { getUsers, updateUserRole, getStats, getLogs } from './admin.controller';
import { authMiddleware, requireAdmin } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validator';
import { z } from 'zod';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

router.get('/users', getUsers);

router.patch('/users/:id/role', validateRequest(z.object({
  role: z.enum(['user', 'admin', 'moderator']),
})), updateUserRole);

router.get('/stats', getStats);

router.get('/logs', getLogs);

export default router;
