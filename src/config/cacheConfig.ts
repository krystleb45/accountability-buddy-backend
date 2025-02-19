import dotenv from "dotenv";

dotenv.config();

interface CacheConfig {
  ttl: number; // Time-to-live in seconds
  maxSize: number; // Maximum cache size
  redisUrl?: string; // Redis URL for distributed caching
}

const cacheConfig: CacheConfig = {
  ttl: parseInt(process.env.CACHE_TTL || "300", 10), // Default: 5 minutes
  maxSize: parseInt(process.env.CACHE_MAX_SIZE || "1000", 10), // Default: 1000 entries
  redisUrl: process.env.REDIS_URL, // Optional Redis URL for distributed caching
};

export default cacheConfig;
