import { Router } from 'express';
import { getApiKeys, addApiKey, deleteApiKey, updateApiKey } from './users.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validator';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/api-keys', getApiKeys);

router.post('/api-keys', validateRequest(z.object({
  brokerName: z.string().min(1),
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  environment: z.enum(['sandbox', 'production']).optional(),
})), addApiKey);

router.put('/api-keys/:id', validateRequest(z.object({
  isActive: z.boolean().optional(),
})), updateApiKey);

router.delete('/api-keys/:id', deleteApiKey);

export default router;
