import rateLimit from 'express-rate-limit';
import { redisService } from '../config/redis';
import { config } from '../config/env';
import { logger } from '../config/logger';

export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    return req.user?.userId || req.ip;
  },
  skip: (req: any) => {
    // Skip rate limiting for health checks and static assets
    return req.url === '/health' || req.url.startsWith('/static');
  },
  handler: async (req: any, res: any) => {
    const identifier = req.user?.userId || req.ip;
    const result = await redisService.incrementRateLimit(
      identifier,
      config.rateLimit.windowMs,
      config.rateLimit.max
    );

    res.set({
      'X-RateLimit-Limit': config.rateLimit.max,
      'X-RateLimit-Remaining': Math.max(0, config.rateLimit.max - result.count),
      'X-RateLimit-Reset': new Date(Date.now() + config.rateLimit.windowMs).toISOString(),
    });

    if (result.blocked) {
      logger.warn('Rate limit exceeded', {
        identifier,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
      });

      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
      });
    }
  },
});
