import type { Server, Socket } from "socket.io";
import redisClient from "../config/redisClient";
import logger from "../utils/winstonLogger";

const PRESENCE_KEY_PREFIX = "user_presence:";

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
   * @desc Mark the user as online in Redis and notify others.
   */
  const markUserOnline = async (): Promise<void> => {
    try {
      await redisClient.set(userPresenceKey, "online", { EX: 300 }); // Use options object for expiration
      socket.broadcast.emit("userOnline", { userId });
      logger.info(`User ${userId} marked as online`);
    } catch (error) {
      logger.error(`Error marking user ${userId} as online: ${(error as Error).message}`);
    }
  };
  

  /**
   * @desc Mark the user as offline in Redis and notify others.
   */
  const markUserOffline = async (): Promise<void> => {
    try {
      await redisClient.del(userPresenceKey);
      socket.broadcast.emit("userOffline", { userId });
      logger.info(`User ${userId} marked as offline`);
    } catch (error) {
      logger.error(`Error marking user ${userId} as offline: ${(error as Error).message}`);
    }
  };

  /**
   * @desc Mark the user as inactive in Redis and notify others.
   */
  const markUserInactive = async (): Promise<void> => {
    try {
      await redisClient.set(userPresenceKey, "inactive", { EX: 60 }); // Use options object for expiration
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
      await redisClient.set(userPresenceKey, "online", { EX: 300 }); // Use options object for expiration
      logger.info(`User ${userId} sent activity ping`);
  
      // Reset the inactivity timeout
      if (activityTimeout) clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        markUserInactive().catch((error) => {
          logger.error(`Error marking user ${userId} as inactive: ${(error as Error).message}`);
        });
      }, 60000);
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
