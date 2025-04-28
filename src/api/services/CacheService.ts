// src/api/services/CacheService.ts
import redisClient from "../../config/redisClient";
import { logger } from "../../utils/winstonLogger";

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

export default {
  /**
   * @desc    Set a value in the cache with an optional TTL.
   * @param   key - The cache key.
   * @param   value - The value to cache (will be serialized).
   * @param   ttlSeconds - Time-to-live in seconds (default: 5m).
   */
  async set(key: string, value: unknown, ttlSeconds: number = DEFAULT_TTL_SECONDS): Promise<void> {
    if (!key || value === undefined) {
      throw new Error("CacheService.set: key and value are both required");
    }

    const serialized = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await redisClient.set(key, serialized, { EX: ttlSeconds });
      logger.info(`CacheService: set key=${key} (ttl=${ttlSeconds}s)`);
    } else {
      await redisClient.set(key, serialized);
      logger.info(`CacheService: set key=${key} (no ttl)`);
    }
  },

  /**
   * @desc    Get a value from the cache.
   * @param   key - The cache key.
   * @returns The cached value (deserialized) or null if missing.
   */
  async get<T>(key: string): Promise<T | null> {
    if (!key) {
      throw new Error("CacheService.get: key is required");
    }

    const data = await redisClient.get(key);
    if (data !== null) {
      logger.info(`CacheService: cache hit key=${key}`);
      return JSON.parse(data) as T;
    } else {
      logger.info(`CacheService: cache miss key=${key}`);
      return null;
    }
  },

  /**
   * @desc    Delete a cache key.
   * @param   key - The cache key to remove.
   */
  async invalidate(key: string): Promise<void> {
    if (!key) {
      throw new Error("CacheService.invalidate: key is required");
    }
    await redisClient.del(key);
    logger.info(`CacheService: invalidated key=${key}`);
  },

  /**
   * @desc    Delete multiple cache keys.
   * @param   keys - Array of keys to remove.
   */
  async invalidateKeys(keys: string[]): Promise<void> {
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new Error("CacheService.invalidateKeys: non-empty array of keys required");
    }
    await redisClient.del(keys);
    logger.info(`CacheService: invalidated keys=[${keys.join(", ")}]`);
  },

  /**
   * @desc    Check whether a cache key exists.
   * @param   key - The cache key to check.
   * @returns true if the key exists, false otherwise.
   */
  async exists(key: string): Promise<boolean> {
    if (!key) {
      throw new Error("CacheService.exists: key is required");
    }
    const result = await redisClient.exists(key);
    const found = result === 1;
    logger.info(`CacheService: key=${key} exists=${found}`);
    return found;
  },

  /**
   * @desc    Retrieve TTL for a cache key.
   * @param   key - The cache key.
   * @returns TTL in seconds, or -1 if none set.
   */
  async getTTL(key: string): Promise<number> {
    if (!key) {
      throw new Error("CacheService.getTTL: key is required");
    }
    const ttl = await redisClient.ttl(key);
    logger.info(`CacheService: ttl key=${key} => ${ttl}s`);
    return ttl;
  },

  /**
   * @desc    Extend the TTL of a cache key.
   * @param   key - The cache key.
   * @param   ttlSeconds - New TTL in seconds.
   */
  async extendTTL(key: string, ttlSeconds: number): Promise<void> {
    if (!key || ttlSeconds <= 0) {
      throw new Error("CacheService.extendTTL: key and positive ttlSeconds are required");
    }
    await redisClient.expire(key, ttlSeconds);
    logger.info(`CacheService: extended ttl key=${key} to ${ttlSeconds}s`);
  },

  /**
   * @desc    Flush the entire Redis database.
   *           Use sparingly!
   */
  async clearAll(): Promise<void> {
    await redisClient.flushDb();
    logger.info("CacheService: flushed entire cache");
  },
};
