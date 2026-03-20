import { z } from 'zod';

export const adminSchemas = {
  updateUserRole: z.object({
    role: z.enum(['user', 'admin', 'moderator']),
  }),
};
