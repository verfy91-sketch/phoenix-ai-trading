import { Router } from 'express';
import { getPortfolio, getHistory, getPerformance } from './portfolio.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateQuery } from '../../middleware/validator';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', validateQuery(z.object({
  limit: z.coerce.number().default(100),
  offset: z.coerce.number().default(0),
})), getPortfolio);

router.get('/history', validateQuery(z.object({
  limit: z.coerce.number().default(100),
  offset: z.coerce.number().default(0),
})), getHistory);

router.get('/performance', getPerformance);

export default router;
