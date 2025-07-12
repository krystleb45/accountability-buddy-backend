// src/utils/cacheHelper.ts - FIXED: Conditional Redis usage
// Check if Redis is disabled
const isRedisDisabled = process.env.DISABLE_REDIS === "true" ||
                       process.env.SKIP_REDIS_INIT === "true" ||
                       process.env.REDIS_DISABLED === "true";

// In-memory cache fallback
const memoryCache = new Map<string, { data: string; expiry: number }>();

// Redis client (only if enabled)
let redisClient: any = null;

if (!isRedisDisabled) {
  try {
    redisClient = require("../config/redisClient").default;
    console.log("✅ CacheHelper using Redis client");
  } catch (error) {
    console.error("Failed to load Redis client for CacheHelper:", error);
  }
} else {
  console.log("🚫 CacheHelper using memory cache (Redis disabled)");
}

// Clean up expired entries from memory cache
const cleanupMemoryCache = (): void => {
  if (memoryCache.size > 50) {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
      if (value.expiry <= now) {
        memoryCache.delete(key);
      }
    }
  }
};

// Function to set a cache with an optional expiry time (default 1 hour)
export const setCache = async (key: string, value: any, expiry = 3600): Promise<void> => {
  try {
    if (redisClient && !isRedisDisabled) {
      // Use Redis
      await redisClient.set(key, JSON.stringify(value), { EX: expiry });
      console.log(`Cache set (Redis): ${key}`);
    } else {
      // Use memory cache
      memoryCache.set(key, {
        data: JSON.stringify(value),
        expiry: Date.now() + (expiry * 1000)
      });
      console.log(`Cache set (Memory): ${key}`);

      // Clean up expired entries periodically
      cleanupMemoryCache();
    }
  } catch (error) {
    console.error(`Error setting cache for key: ${key}`, error);
  }
};

// Function to get a cached value by key
export const getCache = async (key: string): Promise<any | null> => {
  try {
    if (redisClient && !isRedisDisabled) {
      // Use Redis
      const data = await redisClient.get(key);
      console.log(`Cache get (Redis): ${key} - ${data ? "HIT" : "MISS"}`);
      return data ? JSON.parse(data) : null;
    } else {
      // Use memory cache
      const cached = memoryCache.get(key);
      if (cached) {
        if (cached.expiry > Date.now()) {
          console.log(`Cache get (Memory): ${key} - HIT`);
          return JSON.parse(cached.data);
        } else {
          memoryCache.delete(key);
          console.log(`Cache get (Memory): ${key} - EXPIRED`);
        }
      } else {
        console.log(`Cache get (Memory): ${key} - MISS`);
      }
      return null;
    }
  } catch (error) {
    console.error(`Error getting cache for key: ${key}`, error);
    return null;
  }
};

// Function to delete a cache by key
export const deleteCache = async (key: string): Promise<void> => {
  try {
    if (redisClient && !isRedisDisabled) {
      // Use Redis
      await redisClient.del(key);
      console.log(`Cache delete (Redis): ${key}`);
    } else {
      // Use memory cache
      memoryCache.delete(key);
      console.log(`Cache delete (Memory): ${key}`);
    }
  } catch (error) {
    console.error(`Error deleting cache for key: ${key}`, error);
  }
};
