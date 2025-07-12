import { createClient } from "@redis/client";
import { logger } from "../utils/winstonLogger";

// Create a single client variable that will be exported
let redisClient: any;

// Check if Redis is disabled
if (process.env.DISABLE_REDIS === "true") {
  logger.info("🚫 Redis disabled by DISABLE_REDIS flag - using mock client");

  // Create a mock Redis client that doesn't crash the app
  redisClient = {
    connect: async (): Promise<void> => Promise.resolve(),
    quit: async (): Promise<void> => Promise.resolve(),
    set: async (): Promise<string> => Promise.resolve("OK"),
    get: async (): Promise<string | null> => Promise.resolve(null),
    del: async (): Promise<number> => Promise.resolve(0),
    incr: async (): Promise<number> => Promise.resolve(1),
    expire: async (): Promise<boolean> => Promise.resolve(true),
    sAdd: async (): Promise<number> => Promise.resolve(0),
    sRem: async (): Promise<number> => Promise.resolve(0),
    sMembers: async (): Promise<string[]> => Promise.resolve([]),
    exists: async (): Promise<number> => Promise.resolve(0),
    ttl: async (): Promise<number> => Promise.resolve(-1),
    flushDb: async (): Promise<string> => Promise.resolve("OK"),
    keys: async (): Promise<string[]> => Promise.resolve([]),
    setex: async (): Promise<string> => Promise.resolve("OK"),
    sendCommand: async (): Promise<string> => Promise.resolve(""),
    on: (): void => {},
  };
} else {
  // Normal Redis client code when Redis is enabled
  logger.info("🔴 Redis enabled - connecting to Redis server");

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
}

// Single default export
export default redisClient;
