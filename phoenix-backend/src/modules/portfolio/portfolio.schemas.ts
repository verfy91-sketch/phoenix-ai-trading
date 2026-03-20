import { z } from 'zod';

export const portfolioSchemas = {
  getHistory: z.object({
    limit: z.coerce.number().default(100),
    offset: z.coerce.number().default(0),
  }),
};
