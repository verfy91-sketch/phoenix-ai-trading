import Redis from 'ioredis';
import { config } from './env';

class RedisService {
  private client: Redis;
  private connected: boolean = false;

  constructor() {
    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryStrategy: (times) => {
        // Stop retrying after 3 attempts
        if (times > 3) {
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    // Prevent uncaught exceptions from crashing the process
    this.client.on('error', (err) => {
      console.warn('Redis connection error (non-fatal):', err.message);
      this.connected = false;
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
      this.connected = true;
    });

    this.client.on('close', () => {
      console.warn('Redis connection closed');
      this.connected = false;
    });

    // Try to connect but don't throw if it fails
    this.client.connect().catch(() => {
      console.warn('Redis connection failed - running without Redis');
      this.connected = false;
    });
  }

  private async ensureConnected(): Promise<boolean> {
    return this.connected && this.client.status === 'ready';
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (!(await this.ensureConnected())) {
      console.warn('Redis not available - skipping set operation');
      return;
    }
    
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      console.warn('Redis set error (non-fatal):', error);
    }
  }

  async get(key: string): Promise<string | null> {
    if (!(await this.ensureConnected())) {
      console.warn('Redis not available - returning null for get operation');
      return null;
    }
    
    try {
      const value = await this.client.get(key);
      return value;
    } catch (error) {
      console.warn('Redis get error (non-fatal):', error);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    if (!(await this.ensureConnected())) {
      console.warn('Redis not available - skipping del operation');
      return;
    }
    
    try {
      await this.client.del(key);
    } catch (error) {
      console.warn('Redis del error (non-fatal):', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!(await this.ensureConnected())) {
      console.warn('Redis not available - returning false for exists operation');
      return false;
    }
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.warn('Redis exists error (non-fatal):', error);
      return false;
    }
  }

  // Rate limiting
  async incrementRateLimit(identifier: string, windowMs: number, max: number): Promise<{ count: number; blocked: boolean }> {
    if (!(await this.ensureConnected())) {
      console.warn('Redis not available - skipping rate limiting');
      return { count: 0, blocked: false };
    }
    
    try {
      const key = `rate_limit:${identifier}`;
      const current = await this.client.incr(key);
      
      if (current === 1) {
        await this.client.expire(key, Math.ceil(windowMs / 1000));
      }

      return {
        count: current,
        blocked: current > max,
      };
    } catch (error) {
      console.warn('Redis rate limit error (non-fatal):', error);
      return { count: 0, blocked: false };
    }
  }

  // Cache methods
  async cacheExchangeRates(rates: any): Promise<void> {
    if (!(await this.ensureConnected())) {
      console.warn('Redis not available - skipping exchange rate caching');
      return;
    }
    
    try {
      await this.set('exchange_rates', JSON.stringify(rates), 300); // 5 minutes TTL
    } catch (error) {
      console.warn('Redis cache error (non-fatal):', error);
    }
  }

  async getCachedExchangeRates(): Promise<any | null> {
    if (!(await this.ensureConnected())) {
      console.warn('Redis not available - returning null for cached exchange rates');
      return null;
    }
    
    try {
      const cached = await this.get('exchange_rates');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Redis cache get error (non-fatal):', error);
      return null;
    }
  }

  async cacheUserSession(userId: string, sessionData: any): Promise<void> {
    if (!(await this.ensureConnected())) {
      console.warn('Redis not available - skipping user session caching');
      return;
    }
    
    try {
      await this.set(`session:${userId}`, JSON.stringify(sessionData), 86400); // 24 hours TTL
    } catch (error) {
      console.warn('Redis session cache error (non-fatal):', error);
    }
  }

  async getUserSession(userId: string): Promise<any | null> {
    if (!(await this.ensureConnected())) {
      console.warn('Redis not available - returning null for user session');
      return null;
    }
    
    try {
      const session = await this.get(`session:${userId}`);
      return session ? JSON.parse(session) : null;
    } catch (error) {
      console.warn('Redis session get error (non-fatal):', error);
      return null;
    }
  }

  async cachePortfolioSnapshot(userId: string, portfolio: any): Promise<void> {
    if (!(await this.ensureConnected())) {
      console.warn('Redis not available - skipping portfolio snapshot caching');
      return;
    }
    
    try {
      await this.set(`portfolio:${userId}`, JSON.stringify(portfolio), 10); // 10 seconds TTL
    } catch (error) {
      console.warn('Redis portfolio cache error (non-fatal):', error);
    }
  }

  async getCachedPortfolioSnapshot(userId: string): Promise<any | null> {
    if (!(await this.ensureConnected())) {
      console.warn('Redis not available - returning null for portfolio snapshot');
      return null;
    }
    
    try {
      const cached = await this.get(`portfolio:${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Redis portfolio get error (non-fatal):', error);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      try {
        await this.client.quit();
      } catch (error) {
        console.warn('Redis disconnect error (non-fatal):', error);
      }
    }
  }

  // Check if Redis is available
  isAvailable(): boolean {
    return this.connected && this.client.status === 'ready';
  }
}

export const redisService = new RedisService();
