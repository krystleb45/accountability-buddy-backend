import type { RedisClientType } from "@redis/client";
import { createClient } from "@redis/client";
import logger from "../utils/winstonLogger"; // Adjust the path if needed

// Define Redis configuration
const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    reconnectStrategy: (retries: number): number => Math.min(retries * 50, 2000), // Retry logic for connection
  },
  password: process.env.REDIS_PASSWORD || undefined,
};

// Create Redis client without modules/scripts
const redisClient: RedisClientType<Record<string, never>> = createClient(redisConfig);

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
    process.exit(1); // Exit if Redis connection fails
  }
})();

// Graceful shutdown for Redis connection
const gracefulShutdown = async (): Promise<void> => {
  try {
    await redisClient.quit();
    logger.info("Redis connection closed gracefully.");
    process.exit(0);
  } catch (err) {
    logger.error("Error closing Redis connection: " + (err as Error).message);
    process.exit(1); // Exit with error if shutdown fails
  }
};

process.on("SIGINT", gracefulShutdown); // Handle Ctrl+C
process.on("SIGTERM", gracefulShutdown); // Handle termination signals

export default redisClient;
