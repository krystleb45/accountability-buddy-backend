// src/sockets/users.ts - FIXED: Conditional Redis usage
import type { Server, Socket } from "socket.io";
import { User } from "../api/models/User";
import { logger } from "../utils/winstonLogger";

// Check if Redis is disabled
const isRedisDisabled = process.env.DISABLE_REDIS === "true" ||
                       process.env.SKIP_REDIS_INIT === "true" ||
                       process.env.REDIS_DISABLED === "true";

// In-memory online users set fallback
const memoryOnlineUsers = new Set<string>();

// Redis client (only if enabled)
let redisClient: any = null;

if (!isRedisDisabled) {
  try {
    redisClient = require("../config/redisClient").default;
    logger.info("✅ UsersSocket using Redis client");
  } catch (error) {
    logger.error(`Failed to load Redis client for UsersSocket: ${(error as Error).message}`);
  }
} else {
  logger.info("🚫 UsersSocket using memory storage (Redis disabled)");
}

// Redis key prefix for online users
const ONLINE_USERS_KEY = "online_users";

// Helper functions for online users management
const addOnlineUser = async (userId: string): Promise<void> => {
  try {
    if (redisClient && !isRedisDisabled) {
      await redisClient.sAdd(ONLINE_USERS_KEY, userId);
      logger.debug(`Added online user (Redis): ${userId}`);
    } else {
      memoryOnlineUsers.add(userId);
      logger.debug(`Added online user (Memory): ${userId}`);
    }
  } catch (error) {
    logger.error(`Error adding online user ${userId}:`, error);
  }
};

const removeOnlineUser = async (userId: string): Promise<void> => {
  try {
    if (redisClient && !isRedisDisabled) {
      await redisClient.sRem(ONLINE_USERS_KEY, userId);
      logger.debug(`Removed online user (Redis): ${userId}`);
    } else {
      memoryOnlineUsers.delete(userId);
      logger.debug(`Removed online user (Memory): ${userId}`);
    }
  } catch (error) {
    logger.error(`Error removing online user ${userId}:`, error);
  }
};

const getOnlineUsers = async (): Promise<string[]> => {
  try {
    if (redisClient && !isRedisDisabled) {
      const users = await redisClient.sMembers(ONLINE_USERS_KEY);
      logger.debug(`Got online users (Redis): ${users.length} users`);
      return users;
    } else {
      const users = Array.from(memoryOnlineUsers);
      logger.debug(`Got online users (Memory): ${users.length} users`);
      return users;
    }
  } catch (error) {
    logger.error("Error getting online users:", error);
    return [];
  }
};

/**
 * @desc    Handles WebSocket events related to user management.
 * @param   {Server} io - The socket.io server instance.
 * @param   {Socket} socket - The socket object representing the client's connection.
 */
const usersSocket = (io: Server, socket: Socket): void => {
  const userId = socket.data.user?.id as string; // Proper user ID retrieval
  if (!userId) {
    logger.error("Socket connection attempted without a valid user ID.");
    socket.emit("error", { msg: "Authentication error: User ID is missing or invalid." });
    return;
  }

  /**
   * @desc    Marks the user as online and notifies others.
   */
  socket.on("userConnected", async (): Promise<void> => {
    try {
      await addOnlineUser(userId);

      // Notify other users
      socket.broadcast.emit("userStatusUpdate", {
        userId,
        status: "online",
      });

      logger.info(`User ${userId} connected and is now online`);
    } catch (error) {
      logger.error(`Error in userConnected event for user ${userId}: ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to update user status." });
    }
  });

  /**
   * @desc    Handles disconnection and updates user status.
   */
  socket.on("disconnect", async (): Promise<void> => {
    try {
      await removeOnlineUser(userId);

      // Notify other users
      socket.broadcast.emit("userStatusUpdate", {
        userId,
        status: "offline",
      });

      logger.info(`User ${userId} disconnected and is now offline`);
    } catch (error) {
      logger.error(`Error in disconnect event for user ${userId}: ${(error as Error).message}`);
    }
  });

  /**
   * @desc    Updates user status and notifies others.
   * @param   {string} newStatus - The new status of the user (e.g., online, away).
   */
  socket.on("updateStatus", async (newStatus: string): Promise<void> => {
    try {
      const validStatuses = ["online", "away", "busy", "offline", "do_not_disturb"];

      if (!validStatuses.includes(newStatus)) {
        logger.warn(`Invalid status update attempt for user ${userId}: ${newStatus}`);
        socket.emit("error", { msg: "Invalid status." });
        return;
      }

      // Optionally, update the status in the database
      await User.findByIdAndUpdate(userId, { status: newStatus });

      // Update online status in our storage
      if (newStatus === "online") {
        await addOnlineUser(userId);
      } else if (newStatus === "offline") {
        await removeOnlineUser(userId);
      }

      // Notify others about the status update
      socket.broadcast.emit("userStatusUpdate", {
        userId,
        status: newStatus,
      });

      logger.info(`User ${userId} updated status to ${newStatus}`);
    } catch (error) {
      logger.error(`Error in updateStatus event for user ${userId}: ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to update status." });
    }
  });

  /**
   * @desc    Fetches the list of currently online users.
   */
  socket.on("fetchOnlineUsers", async (): Promise<void> => {
    try {
      const onlineUsers = await getOnlineUsers();
      socket.emit("onlineUsers", onlineUsers);
      logger.info(`Online users sent to user ${userId} (${onlineUsers.length} users)`);
    } catch (error) {
      logger.error(`Error fetching online users for user ${userId}: ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to fetch online users." });
    }
  });

  /**
   * @desc    Handles private messaging between users.
   * @param   {Object} messageData - Contains recipientId and message.
   */
  socket.on(
    "privateMessage",
    async ({ recipientId, message }: { recipientId: string; message: string }): Promise<void> => {
      try {
        if (!recipientId || !message) {
          socket.emit("error", { msg: "Recipient and message are required." });
          return;
        }

        // Check if recipient is online
        const recipientSockets = Array.from(io.sockets.sockets.values()).filter(
          (s) => s.data.user?.id === recipientId,
        );

        if (recipientSockets.length === 0) {
          logger.warn(`Private message failed: User ${recipientId} is not online`);
          socket.emit("error", { msg: "Recipient is not online." });
          return;
        }

        // Send the message to the recipient
        recipientSockets.forEach((recipientSocket) =>
          recipientSocket.emit("privateMessage", { from: userId, message }),
        );

        logger.info(`Private message from user ${userId} to user ${recipientId}`);
      } catch (error) {
        logger.error(`Error in privateMessage event for user ${userId}: ${(error as Error).message}`);
        socket.emit("error", { msg: "Failed to send private message." });
      }
    },
  );
};

export default usersSocket;
