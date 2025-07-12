// src/sockets/presence.ts - FIXED: Conditional Redis usage
import type { Server, Socket } from "socket.io";
import { logger } from "../utils/winstonLogger";

// Check if Redis is disabled
const isRedisDisabled = process.env.DISABLE_REDIS === "true" ||
                       process.env.SKIP_REDIS_INIT === "true" ||
                       process.env.REDIS_DISABLED === "true";

// In-memory presence cache fallback
const memoryPresence = new Map<string, { status: string; expiry?: number }>();

// Redis client (only if enabled)
let redisClient: any = null;

if (!isRedisDisabled) {
  try {
    redisClient = require("../config/redisClient").default;
    logger.info("✅ PresenceSocket using Redis client");
  } catch (error) {
    logger.error(`Failed to load Redis client for PresenceSocket: ${(error as Error).message}`);
  }
} else {
  logger.info("🚫 PresenceSocket using memory presence (Redis disabled)");
}

const PRESENCE_KEY_PREFIX = "user_presence:";

// Helper functions for presence management
const setPresence = async (key: string, status: string, ttlSeconds?: number): Promise<void> => {
  try {
    if (redisClient && !isRedisDisabled) {
      if (ttlSeconds) {
        await redisClient.set(key, status, { EX: ttlSeconds });
      } else {
        await redisClient.set(key, status);
      }
      logger.debug(`Presence set (Redis): ${key} = ${status}`);
    } else {
      // Use memory cache
      const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;
      memoryPresence.set(key, { status, expiry });
      logger.debug(`Presence set (Memory): ${key} = ${status}`);

      // Clean up expired entries
      cleanupMemoryPresence();
    }
  } catch (error) {
    logger.error(`Error setting presence for ${key}:`, error);
  }
};

const deletePresence = async (key: string): Promise<void> => {
  try {
    if (redisClient && !isRedisDisabled) {
      await redisClient.del(key);
      logger.debug(`Presence deleted (Redis): ${key}`);
    } else {
      memoryPresence.delete(key);
      logger.debug(`Presence deleted (Memory): ${key}`);
    }
  } catch (error) {
    logger.error(`Error deleting presence for ${key}:`, error);
  }
};

// Clean up expired memory presence entries
const cleanupMemoryPresence = (): void => {
  if (memoryPresence.size > 100) {
    const now = Date.now();
    for (const [key, value] of memoryPresence.entries()) {
      if (value.expiry && value.expiry <= now) {
        memoryPresence.delete(key);
      }
    }
  }
};

const presenceSocket = (_io: Server, socket: Socket): void => {
  const userId = socket.data.user?.id as string; // Ensure userId is retrieved from socket data
  if (!userId) {
    logger.error("Socket connection attempted without a valid user ID.");
    socket.emit("error", { msg: "User ID is missing or invalid." });
    return;
  }

  const userPresenceKey = `${PRESENCE_KEY_PREFIX}${userId}`;
  let activityTimeout: NodeJS.Timeout | null = null;

  /**
   * @desc Mark the user as online and notify others.
   */
  const markUserOnline = async (): Promise<void> => {
    try {
      await setPresence(userPresenceKey, "online", 300); // 5 minutes
      socket.broadcast.emit("userOnline", { userId });
      logger.info(`User ${userId} marked as online`);
    } catch (error) {
      logger.error(`Error marking user ${userId} as online: ${(error as Error).message}`);
    }
  };

  /**
   * @desc Mark the user as offline and notify others.
   */
  const markUserOffline = async (): Promise<void> => {
    try {
      await deletePresence(userPresenceKey);
      socket.broadcast.emit("userOffline", { userId });
      logger.info(`User ${userId} marked as offline`);
    } catch (error) {
      logger.error(`Error marking user ${userId} as offline: ${(error as Error).message}`);
    }
  };

  /**
   * @desc Mark the user as inactive and notify others.
   */
  const markUserInactive = async (): Promise<void> => {
    try {
      await setPresence(userPresenceKey, "inactive", 60); // 1 minute
      socket.broadcast.emit("userInactive", { userId });
      logger.info(`User ${userId} marked as inactive`);
    } catch (error) {
      logger.error(`Error marking user ${userId} as inactive: ${(error as Error).message}`);
    }
  };

  /**
   * @desc Handle activity pings from the user and reset the timeout.
   */
  socket.on("activityPing", async (): Promise<void> => {
    try {
      await setPresence(userPresenceKey, "online", 300); // 5 minutes
      logger.info(`User ${userId} sent activity ping`);

      // Reset the inactivity timeout
      if (activityTimeout) clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        markUserInactive().catch((error) => {
          logger.error(`Error marking user ${userId} as inactive: ${(error as Error).message}`);
        });
      }, 60000); // 60 seconds
    } catch (error) {
      logger.error(`Error processing activity ping for user ${userId}: ${(error as Error).message}`);
    }
  });

  // Initialize the user as online and handle disconnection
  markUserOnline().catch((error) => {
    logger.error(`Error marking user ${userId} as online on connection: ${(error as Error).message}`);
  });

  socket.on("disconnect", () => {
    markUserOffline().catch((error) => {
      logger.error(`Error marking user ${userId} as offline on disconnect: ${(error as Error).message}`);
    });
    if (activityTimeout) clearTimeout(activityTimeout); // Clear timeout on disconnect
  });
};

export default presenceSocket;
