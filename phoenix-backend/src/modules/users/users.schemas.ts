import { z } from 'zod';

export const usersSchemas = {
  addApiKey: z.object({
    brokerName: z.string().min(1, 'Broker name is required'),
    apiKey: z.string().min(1, 'API key is required'),
    apiSecret: z.string().min(1, 'API secret is required'),
    environment: z.enum(['sandbox', 'production']).default('sandbox'),
  }),

  updateApiKey: z.object({
    isActive: z.boolean().optional(),
  }),
};
