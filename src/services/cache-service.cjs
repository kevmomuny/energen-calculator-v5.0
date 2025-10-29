/**
 * Redis Caching Service
 * Implements caching layer for expensive calculations
 */

const Redis = require('ioredis');
const winston = require('winston');

class CacheService {
  constructor(config = {}) {
    this.redis = null;
    this.connected = false;
    this.config = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || process.env.REDIS_PORT || 6379,
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || 0,
      keyPrefix: 'energen:',
      ttl: config.ttl || 3600, // 1 hour default
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
      ...config
    };

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      defaultMeta: { service: 'cache-service' },
      transports: [
        new winston.transports.File({ filename: 'logs/cache.log' })
      ]
    });

    this.init();
  }

  async init() {
    try {
      this.redis = new Redis({
        ...this.config,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.error('Redis connection failed after 3 retries');
            return null;
          }
          return Math.min(times * 100, 3000);
        }
      });

      this.redis.on('connect', () => {
        this.connected = true;
        this.logger.info('Redis connected successfully');
      });

      this.redis.on('error', (err) => {
        this.connected = false;
        this.logger.error('Redis error:', err);
      });

      this.redis.on('close', () => {
        this.connected = false;
        this.logger.warn('Redis connection closed');
      });

      // Test connection
      await this.redis.ping();
      this.connected = true;
    } catch (error) {
      this.logger.error('Failed to initialize Redis:', error);
      this.connected = false;
    }
  }

  /**
   * Generate cache key for calculation
   */
  generateKey(type, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          acc[key] = params[key];
        }
        return acc;
      }, {});

    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(sortedParams))
      .digest('hex');

    return `${this.config.keyPrefix}${type}:${hash}`;
  }

  /**
   * Get cached value
   */
  async get(key) {
    if (!this.connected) return null;

    try {
      const value = await this.redis.get(key);
      if (value) {
        this.logger.debug(`Cache hit: ${key}`);
        return JSON.parse(value);
      }
      this.logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      this.logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached value
   */
  async set(key, value, ttl = null) {
    if (!this.connected) return false;

    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.config.ttl;

      if (expiry > 0) {
        await this.redis.setex(key, expiry, serialized);
      } else {
        await this.redis.set(key, serialized);
      }

      this.logger.debug(`Cache set: ${key} (TTL: ${expiry}s)`);
      return true;
    } catch (error) {
      this.logger.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async del(key) {
    if (!this.connected) return false;

    try {
      await this.redis.del(key);
      this.logger.debug(`Cache delete: ${key}`);
      return true;
    } catch (error) {
      this.logger.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Clear all cache with pattern
   */
  async clear(pattern = '*') {
    if (!this.connected) return false;

    try {
      const keys = await this.redis.keys(`${this.config.keyPrefix}${pattern}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.info(`Cleared ${keys.length} cache entries`);
      }
      return true;
    } catch (error) {
      this.logger.error('Cache clear error:', error);
      return false;
    }
  }

  /**
   * Cache wrapper for expensive operations
   */
  async wrap(key, fn, ttl = null) {
    // Try to get from cache
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.connected) {
      return { connected: false };
    }

    try {
      const info = await this.redis.info('stats');
      const dbSize = await this.redis.dbsize();

      return {
        connected: true,
        dbSize,
        info
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      this.connected = false;
      this.logger.info('Redis connection closed');
    }
  }
}

module.exports = CacheService;
