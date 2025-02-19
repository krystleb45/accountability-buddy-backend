import type { Server, Socket } from "socket.io";
import type { NotificationDocument } from "../models/Notification";
import Notification from "../models/Notification";
import logger from "../utils/winstonLogger";

/**
 * @desc    Handles socket events related to notifications.
 * @param   _io - The socket.io server instance.
 * @param   socket - The socket object representing the client's connection.
 */
const notificationSocket = (_io: Server, socket: Socket): void => {
  const userId = socket.data.user?.id as string;
  if (!userId) {
    logger.error("Socket connection attempted without a valid user ID.");
    socket.emit("error", { msg: "User ID is missing or invalid." });
    return;
  }

  logger.info(`User connected for notifications: ${userId}`);

  socket.on("fetchNotifications", async () => {
    try {
      const notifications: NotificationDocument[] = await Notification.find({ userId })
        .sort({ date: -1 })
        .limit(50);

      socket.emit("notifications", notifications);
    } catch (error) {
      logger.error(`Error fetching notifications for user ${userId}: ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to fetch notifications." });
    }
  });

  socket.on("markAsRead", async (notificationId: string) => {
    try {
      if (!notificationId) {
        socket.emit("error", { msg: "Notification ID is required." });
        return; // Explicitly return to avoid falling through
      }
  
      const notification = await Notification.findById(notificationId);
  
      if (!notification || notification.user.toString() !== userId) {
        socket.emit("error", { msg: "Notification not found or unauthorized access." });
        return; // Explicitly return to avoid falling through
      }
  
      notification.read = true;
      await notification.save();
  
      socket.emit("notificationUpdated", notification);
      logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
      return; // Explicitly return after successful execution
    } catch (error) {
      logger.error(`Error marking notification as read for user ${userId}: ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to mark notification as read." });
      return; // Explicitly return to satisfy all paths
    }
  });
  

  socket.on("newNotification", (notification: NotificationDocument) => {
    try {
      if (notification.user.toString() === userId) {
        socket.emit("newNotification", notification);
        logger.info(`New notification sent to user ${userId}`);
      } else {
        logger.warn(`Unauthorized notification attempt for user ${userId}`);
        socket.emit("error", { msg: "Unauthorized notification received." });
      }
    } catch (error) {
      logger.error(`Error sending new notification to user ${userId}: ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to send new notification." });
    }
  });

  socket.on("disconnect", () => {
    logger.info(`User disconnected from notifications: ${userId}`);
  });
};

export default notificationSocket;
