import redisClient from "../config/redisClient"; // Redis client setup
import logger from "../utils/winstonLogger"; // For logging events

export const CacheInvalidationService = {
  /**
   * @desc    Invalidate a specific cache entry by key.
   * @param   key - The cache key to invalidate.
   */
  async invalidateCacheByKey(key: string): Promise<void> {
    try {
      if (!key) throw new Error("Cache key is required for invalidation");

      const result = await redisClient.del(key); // Delete the cache key
      if (result) {
        logger.info(`Cache invalidated for key: ${key}`);
      } else {
        logger.warn(`No cache found for key: ${key}`);
      }
    } catch (error) {
      logger.error(`Error invalidating cache for key: ${key} - ${String(error)}`);
      throw new Error("Failed to invalidate cache by key");
    }
  },

  /**
   * @desc    Invalidate multiple cache entries by keys.
   * @param   keys - Array of cache keys to invalidate.
   */
  async invalidateCacheByKeys(keys: string[]): Promise<void> {
    try {
      if (!Array.isArray(keys) || keys.length === 0) {
        throw new Error("An array of cache keys is required for invalidation");
      }

      const result = await redisClient.del(keys); // Delete multiple cache keys
      if (result) {
        logger.info(`Cache invalidated for keys: ${keys.join(", ")}`);
      } else {
        logger.warn(`No matching cache found for keys: ${keys.join(", ")}`);
      }
    } catch (error) {
      logger.error(`Error invalidating cache for keys: ${keys.join(", ")} - ${String(error)}`);
      throw new Error("Failed to invalidate cache by keys");
    }
  },

  /**
   * @desc    Invalidate cache by pattern (e.g., user-related keys).
   * @param   pattern - Redis pattern to match keys (e.g., 'user:*').
   */
  async invalidateCacheByPattern(pattern: string): Promise<void> {
    try {
      if (!pattern) throw new Error("Pattern is required for cache invalidation");

      const keys = await redisClient.keys(pattern); // Find keys matching the pattern
      if (keys.length > 0) {
        await redisClient.del(keys); // Delete matching keys
        logger.info(`Cache invalidated for keys matching pattern: ${pattern}`);
      } else {
        logger.info(`No cache keys found matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`Error invalidating cache by pattern: ${pattern} - ${String(error)}`);
      throw new Error("Failed to invalidate cache by pattern");
    }
  },

  /**
   * @desc    Clears all cache entries (useful for global resets).
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

  /**
   * @desc    Conditional cache invalidation based on TTL.
   * @param   key - The cache key to check.
   * @param   threshold - TTL threshold in seconds (invalidate if TTL < threshold).
   */
  async invalidateCacheIfTTLBelow(key: string, threshold: number): Promise<void> {
    try {
      if (!key || !threshold) {
        throw new Error("Key and TTL threshold are required for conditional invalidation");
      }

      const ttl = await redisClient.ttl(key); // Get the TTL of the key
      if (ttl !== -1 && ttl < threshold) {
        await redisClient.del(key); // Invalidate if TTL is below threshold
        logger.info(`Cache invalidated for key: ${key} (TTL below ${threshold} seconds)`);
      } else if (ttl === -1) {
        logger.warn(`Cache key ${key} does not have a TTL set`);
      }
    } catch (error) {
      logger.error(`Error invalidating cache based on TTL for key: ${key} - ${String(error)}`);
      throw new Error("Failed to invalidate cache based on TTL");
    }
  },

  /**
   * @desc    Invalidate all keys related to a specific user.
   * @param   userId - The ID of the user whose cache entries should be invalidated.
   */
  async invalidateUserCache(userId: string): Promise<void> {
    try {
      if (!userId) throw new Error("User ID is required for cache invalidation");

      const pattern = `user:${userId}:*`; // Pattern to match user-related keys
      await this.invalidateCacheByPattern(pattern);
      logger.info(`Cache invalidated for user-related keys: ${pattern}`);
    } catch (error) {
      logger.error(`Error invalidating user cache for user ID: ${userId} - ${String(error)}`);
      throw new Error("Failed to invalidate user cache");
    }
  },
};

export default CacheInvalidationService;
