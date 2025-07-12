// src/config/redisClient.ts - FIXED: Conditional import to prevent Redis loading
import { logger } from "../utils/winstonLogger";

// Create a single client variable that will be exported
let redisClient: any;

// Check if Redis is disabled BEFORE importing anything Redis-related
if (process.env.DISABLE_REDIS === "true" || process.env.SKIP_REDIS_INIT === "true" || process.env.REDIS_DISABLED === "true") {
  logger.info("🚫 Redis disabled by environment flags - using comprehensive mock client");
  console.log("🚫 Redis disabled - using mock client");

  // Create a comprehensive mock Redis client that matches all methods
  redisClient = {
    // Connection methods
    connect: async (): Promise<void> => {
      console.log("🚫 Mock Redis: connect() called");
      return Promise.resolve();
    },
    disconnect: async (): Promise<void> => Promise.resolve(),
    quit: async (): Promise<void> => Promise.resolve(),
    on: (): void => {},
    off: (): void => {},

    // Basic Redis commands
    get: async (): Promise<string | null> => Promise.resolve(null),
    set: async (): Promise<string> => Promise.resolve("OK"),
    del: async (): Promise<number> => Promise.resolve(0),
    exists: async (): Promise<number> => Promise.resolve(0),
    ttl: async (): Promise<number> => Promise.resolve(-1),
    expire: async (): Promise<boolean> => Promise.resolve(true),

    // Advanced Redis commands
    incr: async (): Promise<number> => Promise.resolve(1),
    decr: async (): Promise<number> => Promise.resolve(0),
    keys: async (): Promise<string[]> => Promise.resolve([]),
    flushDb: async (): Promise<string> => Promise.resolve("OK"),
    flushAll: async (): Promise<string> => Promise.resolve("OK"),

    // Set operations
    sAdd: async (): Promise<number> => Promise.resolve(0),
    sRem: async (): Promise<number> => Promise.resolve(0),
    sMembers: async (): Promise<string[]> => Promise.resolve([]),
    sCard: async (): Promise<number> => Promise.resolve(0),

    // Hash operations
    hGet: async (): Promise<string | null> => Promise.resolve(null),
    hSet: async (): Promise<number> => Promise.resolve(1),
    hDel: async (): Promise<number> => Promise.resolve(1),
    hGetAll: async (): Promise<Record<string, string>> => Promise.resolve({}),
    hExists: async (): Promise<boolean> => Promise.resolve(false),

    // List operations
    lPush: async (): Promise<number> => Promise.resolve(1),
    rPush: async (): Promise<number> => Promise.resolve(1),
    lPop: async (): Promise<string | null> => Promise.resolve(null),
    rPop: async (): Promise<string | null> => Promise.resolve(null),
    lLen: async (): Promise<number> => Promise.resolve(0),

    // Sorted set operations
    zAdd: async (): Promise<number> => Promise.resolve(1),
    zRem: async (): Promise<number> => Promise.resolve(1),
    zRange: async (): Promise<string[]> => Promise.resolve([]),
    zScore: async (): Promise<number | null> => Promise.resolve(null),

    // String operations with expiry
    setex: async (): Promise<string> => Promise.resolve("OK"),
    getex: async (): Promise<string | null> => Promise.resolve(null),

    // Generic command sender (for rate limiters)
    sendCommand: async (): Promise<any> => {
      console.log("🚫 Mock Redis: sendCommand() called");
      return Promise.resolve("");
    },

    // Status properties
    isReady: false,
    status: "disabled",

    // Pub/Sub (if needed)
    publish: async (): Promise<number> => Promise.resolve(0),
    subscribe: async (): Promise<void> => Promise.resolve(),
    unsubscribe: async (): Promise<void> => Promise.resolve(),

    // Transaction support
    multi: () => ({
      exec: async () => Promise.resolve([]),
      set: () => ({}),
      get: () => ({}),
      del: () => ({})
    })
  };

  logger.info("✅ Mock Redis client created successfully");

} else {
  // Only import Redis modules when actually needed
  logger.info("🔴 Redis enabled - loading Redis modules and connecting");
  console.log("🔴 Redis enabled - attempting connection");

  try {
    // Dynamic import to avoid loading Redis when disabled
    const { createClient } = require("@redis/client");

    // Define Redis configuration
    const redisConfig = {
      socket: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        reconnectStrategy: (retries: number): number => Math.min(retries * 50, 2000),
      },
      password: process.env.REDIS_PASSWORD || undefined,
    };

    // Create Redis client without modules/scripts
    redisClient = createClient(redisConfig);

    // Attach event listeners for Redis
    redisClient.on("connect", (): void => {
      logger.info("Connecting to Redis...");
    });

    redisClient.on("ready", (): void => {
      logger.info("Redis client ready for use.");
    });

    redisClient.on("error", (err: Error): void => {
      logger.error("Redis error: " + err.message);
    });

    redisClient.on("end", (): void => {
      logger.info("Redis client disconnected.");
    });

    // Connect to Redis
    void (async (): Promise<void> => {
      try {
        await redisClient.connect();
        logger.info("Successfully connected to Redis.");
      } catch (error) {
        logger.error("Could not establish a connection to Redis: " + (error as Error).message);
        // DON'T EXIT - just log the error and continue without Redis
        logger.warn("⚠️ Continuing without Redis - some features may be limited");
      }
    })();

    // Graceful shutdown for Redis connection
    const gracefulShutdown = async (): Promise<void> => {
      try {
        if (redisClient && typeof redisClient.quit === "function") {
          await redisClient.quit();
          logger.info("Redis connection closed gracefully.");
        }
      } catch (err) {
        logger.error("Error closing Redis connection: " + (err as Error).message);
      }
    };

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);

  } catch (error) {
    logger.error("Failed to load Redis module: " + (error as Error).message);
    logger.warn("⚠️ Falling back to mock Redis client");

    // Fallback to mock client if Redis module fails to load
    redisClient = {
      connect: async (): Promise<void> => Promise.resolve(),
      quit: async (): Promise<void> => Promise.resolve(),
      set: async (): Promise<string> => Promise.resolve("OK"),
      get: async (): Promise<string | null> => Promise.resolve(null),
      del: async (): Promise<number> => Promise.resolve(0),
      on: (): void => {},
      sendCommand: async (): Promise<any> => Promise.resolve(""),
      isReady: false,
      status: "fallback"
    };
  }
}

// Single default export
export default redisClient;
