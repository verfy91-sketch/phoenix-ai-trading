import { z } from 'zod';

export const tradingSchemas = {
  submitOrder: z.object({
    symbol: z.string().min(1, 'Symbol is required'),
    side: z.enum(['BUY', 'SELL']),
    type: z.enum(['MARKET', 'LIMIT']),
    price: z.number().positive('Price must be positive').optional(),
    quantity: z.number().positive('Quantity must be positive'),
  }),
};
