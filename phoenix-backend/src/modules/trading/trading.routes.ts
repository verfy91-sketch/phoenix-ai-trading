import { Router } from 'express';
import { submitOrder, getOrders, cancelOrder, getPortfolio, getPerformance } from './trading.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validator';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/orders', validateRequest(z.object({
  symbol: z.string().min(1),
  side: z.enum(['BUY', 'SELL']),
  type: z.enum(['MARKET', 'LIMIT']),
  price: z.number().positive().optional(),
  quantity: z.number().positive(),
})), submitOrder);

router.get('/orders', getOrders);

router.delete('/orders/:id', cancelOrder);

router.get('/portfolio', getPortfolio);

router.get('/performance', getPerformance);

export default router;
