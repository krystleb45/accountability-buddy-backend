// src/api/services/CacheService.ts - FIXED: Clean syntax, conditional Redis
import { logger } from "../../utils/winstonLogger";

// Check if Redis is disabled
const isRedisDisabled = process.env.DISABLE_REDIS === "true" ||
                       process.env.SKIP_REDIS_INIT === "true" ||
                       process.env.REDIS_DISABLED === "true";

// In-memory cache fallback
const memoryCache = new Map<string, { data: string; expiry?: number }>();
const DEFAULT_TTL_SECONDS = 300; // 5 minutes

// Redis client (only if enabled)
let redisClient: any = null;

if (!isRedisDisabled) {
  try {
    redisClient = require("../../config/redisClient").default;
    logger.info("✅ CacheService using Redis client");
  } catch (error) {
    logger.error(`Failed to load Redis client for CacheService: ${(error as Error).message}`);
  }
} else {
  logger.info("🚫 CacheService using memory cache (Redis disabled)");
}

// Helper function to clean up expired memory cache entries
const cleanupMemoryCache = (): void => {
  if (memoryCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
      if (value.expiry && value.expiry <= now) {
        memoryCache.delete(key);
      }
    }
  }
};

const CacheService = {
  /**
   * Set a value in the cache with an optional TTL
   */
  async set(key: string, value: unknown, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> {
    if (!key || value === undefined) {
      throw new Error("CacheService.set: key and value are both required");
    }

    try {
      const serialized = JSON.stringify(value);

      if (redisClient && !isRedisDisabled) {
        if (ttlSeconds > 0) {
          await redisClient.set(key, serialized, { EX: ttlSeconds });
          logger.info(`CacheService: set key=${key} (ttl=${ttlSeconds}s) [Redis]`);
        } else {
          await redisClient.set(key, serialized);
          logger.info(`CacheService: set key=${key} (no ttl) [Redis]`);
        }
      } else {
        // Use memory cache
        const expiry = ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : undefined;
        memoryCache.set(key, { data: serialized, expiry });
        logger.info(`CacheService: set key=${key} (ttl=${ttlSeconds}s) [Memory]`);

        cleanupMemoryCache();
      }
    } catch (error) {
      logger.error(`CacheService.set failed for key=${key}:`, error);
      throw error;
    }
  },

  /**
   * Get a value from the cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!key) {
      throw new Error("CacheService.get: key is required");
    }

    try {
      if (redisClient && !isRedisDisabled) {
        const data = await redisClient.get(key);
        if (data !== null) {
          logger.info(`CacheService: cache hit key=${key} [Redis]`);
          return JSON.parse(data) as T;
        } else {
          logger.info(`CacheService: cache miss key=${key} [Redis]`);
          return null;
        }
      } else {
        // Use memory cache
        const cached = memoryCache.get(key);
        if (cached) {
          if (!cached.expiry || cached.expiry > Date.now()) {
            logger.info(`CacheService: cache hit key=${key} [Memory]`);
            return JSON.parse(cached.data) as T;
          } else {
            memoryCache.delete(key);
            logger.info(`CacheService: cache expired key=${key} [Memory]`);
          }
        } else {
          logger.info(`CacheService: cache miss key=${key} [Memory]`);
        }
        return null;
      }
    } catch (error) {
      logger.error(`CacheService.get failed for key=${key}:`, error);
      return null;
    }
  },

  /**
   * Delete a cache key
   */
  async invalidate(key: string): Promise<void> {
    if (!key) {
      throw new Error("CacheService.invalidate: key is required");
    }

    try {
      if (redisClient && !isRedisDisabled) {
        await redisClient.del(key);
        logger.info(`CacheService: invalidated key=${key} [Redis]`);
      } else {
        memoryCache.delete(key);
        logger.info(`CacheService: invalidated key=${key} [Memory]`);
      }
    } catch (error) {
      logger.error(`CacheService.invalidate failed for key=${key}:`, error);
      throw error;
    }
  },

  /**
   * Delete multiple cache keys
   */
  async invalidateKeys(keys: string[]): Promise<void> {
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new Error("CacheService.invalidateKeys: non-empty array of keys required");
    }

    try {
      if (redisClient && !isRedisDisabled) {
        await redisClient.del(keys);
        logger.info(`CacheService: invalidated keys=[${keys.join(", ")}] [Redis]`);
      } else {
        keys.forEach(key => memoryCache.delete(key));
        logger.info(`CacheService: invalidated keys=[${keys.join(", ")}] [Memory]`);
      }
    } catch (error) {
      logger.error("CacheService.invalidateKeys failed:", error);
      throw error;
    }
  },

  /**
   * Check whether a cache key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!key) {
      throw new Error("CacheService.exists: key is required");
    }

    try {
      if (redisClient && !isRedisDisabled) {
        const result = await redisClient.exists(key);
        const found = result === 1;
        logger.info(`CacheService: key=${key} exists=${found} [Redis]`);
        return found;
      } else {
        const cached = memoryCache.get(key);
        const found = cached && (!cached.expiry || cached.expiry > Date.now());
        logger.info(`CacheService: key=${key} exists=${!!found} [Memory]`);
        return !!found;
      }
    } catch (error) {
      logger.error(`CacheService.exists failed for key=${key}:`, error);
      return false;
    }
  },

  /**
   * Retrieve TTL for a cache key
   */
  async getTTL(key: string): Promise<number> {
    if (!key) {
      throw new Error("CacheService.getTTL: key is required");
    }

    try {
      if (redisClient && !isRedisDisabled) {
        const ttl = await redisClient.ttl(key);
        logger.info(`CacheService: ttl key=${key} => ${ttl}s [Redis]`);
        return ttl;
      } else {
        const cached = memoryCache.get(key);
        if (cached && cached.expiry) {
          const ttl = Math.max(0, Math.floor((cached.expiry - Date.now()) / 1000));
          logger.info(`CacheService: ttl key=${key} => ${ttl}s [Memory]`);
          return ttl;
        }
        logger.info(`CacheService: ttl key=${key} => -1s [Memory - no expiry]`);
        return -1;
      }
    } catch (error) {
      logger.error(`CacheService.getTTL failed for key=${key}:`, error);
      return -1;
    }
  },

  /**
   * Extend the TTL of a cache key
   */
  async extendTTL(key: string, ttlSeconds: number): Promise<void> {
    if (!key || ttlSeconds <= 0) {
      throw new Error("CacheService.extendTTL: key and positive ttlSeconds are required");
    }

    try {
      if (redisClient && !isRedisDisabled) {
        await redisClient.expire(key, ttlSeconds);
        logger.info(`CacheService: extended ttl key=${key} to ${ttlSeconds}s [Redis]`);
      } else {
        const cached = memoryCache.get(key);
        if (cached) {
          cached.expiry = Date.now() + (ttlSeconds * 1000);
          logger.info(`CacheService: extended ttl key=${key} to ${ttlSeconds}s [Memory]`);
        }
      }
    } catch (error) {
      logger.error(`CacheService.extendTTL failed for key=${key}:`, error);
      throw error;
    }
  },

  /**
   * Flush the entire cache
   */
  async clearAll(): Promise<void> {
    try {
      if (redisClient && !isRedisDisabled) {
        await redisClient.flushDb();
        logger.info("CacheService: flushed entire cache [Redis]");
      } else {
        memoryCache.clear();
        logger.info("CacheService: flushed entire cache [Memory]");
      }
    } catch (error) {
      logger.error("CacheService.clearAll failed:", error);
      throw error;
    }
  }
};

export default CacheService;
