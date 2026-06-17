import Redis from 'ioredis';

export class CacheService {
  private static redisClient: Redis | null = null;
  private static memoryCache = new Map<string, { value: any; expiry: number }>();

  static initialize() {
    if (process.env.REDIS_URL) {
      try {
        this.redisClient = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: null, // Let it auto-reconnect continuously
          connectTimeout: 5000,
          reconnectOnError: () => true
        });

        this.redisClient.on('connect', () => {
          console.log('✅ CacheService connected to Redis');
        });

        this.redisClient.on('error', (err) => {
          console.log('⚠️ Redis client connection error:', err.message);
        });
      } catch (err) {
        console.log('⚠️ Redis initialization failed. Using local in-memory cache.');
      }
    } else {
      console.log('ℹ️ No REDIS_URL configured. Using local in-memory cache.');
    }
  }

  private static get isRedisReady(): boolean {
    return this.redisClient !== null && this.redisClient.status === 'ready';
  }

  static async get<T>(key: string): Promise<T | null> {
    if (this.isRedisReady && this.redisClient) {
      try {
        const val = await this.redisClient.get(key);
        return val ? JSON.parse(val) as T : null;
      } catch (err) {
        console.warn('[CacheService] Redis get failed:', err);
      }
    }

    // Memory Fallback
    const cached = this.memoryCache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.memoryCache.delete(key);
      return null;
    }

    return cached.value as T;
  }

  static async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return;
      } catch (err) {
        console.warn('[CacheService] Redis set failed:', err);
      }
    }

    // Memory Fallback
    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000
    });
  }

  static async del(key: string): Promise<void> {
    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (err) {
        console.warn('[CacheService] Redis del failed:', err);
      }
    }

    // Memory Fallback
    this.memoryCache.delete(key);
  }

  static async clear(): Promise<void> {
    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.flushdb();
        return;
      } catch (err) {
        console.warn('[CacheService] Redis clear failed:', err);
      }
    }

    // Memory Fallback
    this.memoryCache.clear();
  }

  static async checkHealth(): Promise<boolean> {
    if (!this.isRedisReady || !this.redisClient) return false;
    try {
      const ping = await this.redisClient.ping();
      return ping === 'PONG';
    } catch {
      return false;
    }
  }

  static async shutdown() {
    console.log('[CacheService] Disconnecting Redis...');
    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch (err: any) {
        console.warn('[CacheService] Redis quit error:', err.message);
      }
    }
  }
}

// Initialize on load
CacheService.initialize();