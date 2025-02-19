import redisClient from "../config/redisClient"; // Redis client setup
import logger from "../utils/winstonLogger"; // Logger setup

export const CacheService = {
  /**
   * @desc    Set a value in the cache with an optional TTL.
   * @param   key - The cache key.
   * @param   value - The value to cache (will be serialized).
   * @param   ttl - Optional time-to-live in seconds.
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      if (!key || value === undefined) throw new Error("Key and value are required for caching");

      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await redisClient.set(key, serializedValue, { EX: ttl });
        logger.info(`Cache set for key: ${key} with TTL: ${ttl} seconds`);
      } else {
        await redisClient.set(key, serializedValue);
        logger.info(`Cache set for key: ${key} without TTL`);
      }
    } catch (error) {
      logger.error(`Error setting cache for key: ${key} - ${String(error)}`);
      throw new Error("Failed to set cache");
    }
  },

  /**
   * @desc    Get a value from the cache.
   * @param   key - The cache key.
   * @returns The cached value (deserialized) or null if not found.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!key) throw new Error("Key is required to get cache");

      const data = await redisClient.get(key);
      if (data) {
        logger.info(`Cache hit for key: ${key}`);
        return JSON.parse(data) as T;
      } else {
        logger.info(`Cache miss for key: ${key}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error getting cache for key: ${key} - ${String(error)}`);
      throw new Error("Failed to get cache");
    }
  },

  /**
   * @desc    Invalidate (delete) a specific cache key.
   * @param   key - The cache key to invalidate.
   */
  async invalidate(key: string): Promise<void> {
    try {
      if (!key) throw new Error("Key is required to invalidate cache");

      await redisClient.del(key);
      logger.info(`Cache invalidated for key: ${key}`);
    } catch (error) {
      logger.error(`Error invalidating cache for key: ${key} - ${String(error)}`);
      throw new Error("Failed to invalidate cache");
    }
  },

  /**
   * @desc    Check if a cache key exists.
   * @param   key - The cache key to check.
   * @returns Whether the cache key exists or not.
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!key) throw new Error("Key is required to check cache existence");

      const exists = await redisClient.exists(key);
      logger.info(`Cache key ${exists ? "exists" : "does not exist"} for key: ${key}`);
      return exists === 1;
    } catch (error) {
      logger.error(`Error checking cache existence for key: ${key} - ${String(error)}`);
      throw new Error("Failed to check cache existence");
    }
  },

  /**
   * @desc    Invalidate multiple cache keys.
   * @param   keys - Array of cache keys to invalidate.
   */
  async invalidateMultiple(keys: string[]): Promise<void> {
    try {
      if (!Array.isArray(keys) || keys.length === 0) {
        throw new Error("An array of keys is required to invalidate multiple cache keys");
      }

      await redisClient.del(keys);
      logger.info(`Cache invalidated for keys: ${keys.join(", ")}`);
    } catch (error) {
      logger.error(`Error invalidating multiple cache keys: ${String(error)}`);
      throw new Error("Failed to invalidate multiple cache keys");
    }
  },

  /**
   * @desc    Extend the TTL (time-to-live) of a cache key.
   * @param   key - The cache key.
   * @param   ttl - New TTL in seconds.
   */
  async extendTTL(key: string, ttl: number): Promise<void> {
    try {
      if (!key || !ttl) {
        throw new Error("Key and TTL are required to extend TTL");
      }

      await redisClient.expire(key, ttl);
      logger.info(`Extended TTL for key: ${key} to ${ttl} seconds`);
    } catch (error) {
      logger.error(`Error extending TTL for key: ${key} - ${String(error)}`);
      throw new Error("Failed to extend TTL");
    }
  },

  /**
   * @desc    Get TTL (time-to-live) of a cache key.
   * @param   key - The cache key.
   * @returns TTL in seconds or -1 if no TTL is set.
   */
  async getTTL(key: string): Promise<number> {
    try {
      if (!key) throw new Error("Key is required to get TTL");

      const ttl = await redisClient.ttl(key);
      if (ttl !== -1) {
        logger.info(`TTL for key: ${key} is ${ttl} seconds`);
      } else {
        logger.info(`No TTL set for key: ${key}`);
      }
      return ttl;
    } catch (error) {
      logger.error(`Error getting TTL for key: ${key} - ${String(error)}`);
      throw new Error("Failed to get TTL");
    }
  },

  /**
   * @desc    Clear all cache entries (useful for global resets).
   */
  async clearAllCache(): Promise<void> {
    try {
      await redisClient.flushDb(); // Clears the entire Redis database
      logger.info("All cache entries cleared");
    } catch (error) {
      logger.error(`Error clearing all cache: ${String(error)}`);
      throw new Error("Failed to clear all cache");
    }
  },
};

export default CacheService;
