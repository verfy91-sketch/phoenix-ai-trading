import Redis from 'ioredis';
import { config } from './env';

class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    const value = await this.client.get(key);
    return value;
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // Rate limiting
  async incrementRateLimit(identifier: string, windowMs: number, max: number): Promise<{ count: number; blocked: boolean }> {
    const key = `rate_limit:${identifier}`;
    const current = await this.client.incr(key);
    
    if (current === 1) {
      await this.client.expire(key, Math.ceil(windowMs / 1000));
    }

    return {
      count: current,
      blocked: current > max,
    };
  }

  // Cache methods
  async cacheExchangeRates(rates: any): Promise<void> {
    await this.set('exchange_rates', JSON.stringify(rates), 300); // 5 minutes TTL
  }

  async getCachedExchangeRates(): Promise<any | null> {
    const cached = await this.get('exchange_rates');
    return cached ? JSON.parse(cached) : null;
  }

  async cacheUserSession(userId: string, sessionData: any): Promise<void> {
    await this.set(`session:${userId}`, JSON.stringify(sessionData), 86400); // 24 hours TTL
  }

  async getUserSession(userId: string): Promise<any | null> {
    const session = await this.get(`session:${userId}`);
    return session ? JSON.parse(session) : null;
  }

  async cachePortfolioSnapshot(userId: string, portfolio: any): Promise<void> {
    await this.set(`portfolio:${userId}`, JSON.stringify(portfolio), 10); // 10 seconds TTL
  }

  async getCachedPortfolioSnapshot(userId: string): Promise<any | null> {
    const cached = await this.get(`portfolio:${userId}`);
    return cached ? JSON.parse(cached) : null;
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export const redisService = new RedisService();
