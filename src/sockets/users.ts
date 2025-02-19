import type { Server, Socket } from "socket.io";
import redisClient from "../config/redisClient";
import User from "../models/User";
import logger from "../utils/winstonLogger"; // Winston logger

// Redis key prefix for online users
const ONLINE_USERS_KEY = "online_users";

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
      await redisClient.sAdd(ONLINE_USERS_KEY, userId);

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
      await redisClient.sRem(ONLINE_USERS_KEY, userId);

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
        socket.emit("error", { msg: "Invalid status." }); // Removed 'return' before 'socket.emit'
        return;
      }
  
      // Optionally, update the status in the database
      await User.findByIdAndUpdate(userId, { status: newStatus });
  
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
      const onlineUsers = await redisClient.sMembers(ONLINE_USERS_KEY);
      socket.emit("onlineUsers", onlineUsers);
      logger.info(`Online users sent to user ${userId}`);
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
