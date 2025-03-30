import { Server, Socket } from "socket.io";
import { logger } from "../utils/winstonLogger";  // Assuming you have logging utility

// Function to handle WebSocket connections
export const chatSocketHandler = (io: Server, socket: Socket): void => {
  // Handle the WebSocket connection logic here
  socket.on("joinChat", async (chatId: string) => {
    try {
      await socket.join(chatId);  // Join the room, awaited to handle promise properly
      logger.info(`User ${socket.id} joined chat ${chatId}`);
    } catch (error) {
      logger.error(`Error joining chat ${chatId}: ${error}`);
    }
  });

  // Listen for a new message
  socket.on("newMessage", (data: { chatId: string; message: string; userId: string }) => {
    const { chatId, message, userId } = data;
    logger.info(`New message in chat ${chatId} from user ${userId}: ${message}`);
    
    // Emit the new message to the chat room
    io.to(chatId).emit("newMessage", { userId, message });

    // Optional: Save message to the database here (e.g., using a service for chat history)
  });

  // Listen for user typing event
  socket.on("userTyping", (data: { chatId: string; userId: string }) => {
    const { chatId, userId } = data;
    logger.info(`User ${userId} is typing in chat ${chatId}`);

    // Emit typing event to others in the same chat
    socket.to(chatId).emit("userTyping", { userId });
  });

  socket.on("joinChat", async (chatId: string) => {
    try {
      await socket.join(chatId);  // Await the join action
      logger.info(`User ${socket.id} joined chat ${chatId}`);
    } catch (error) {
      logger.error(`Error joining chat ${chatId} for user ${socket.id}: ${(error as Error).message}`);
    }
  });
  
  socket.on("leaveChat", async (chatId: string) => {
    try {
      await socket.leave(chatId);  // Await the leave action
      logger.info(`User ${socket.id} left chat ${chatId}`);
    } catch (error) {
      logger.error(`Error leaving chat ${chatId} for user ${socket.id}: ${(error as Error).message}`);
    }
  });
  

  // Listen for when a message is marked as read
  socket.on("markMessageAsRead", (data: { chatId: string; messageId: string }) => {
    const { chatId, messageId } = data;
    // Logic to mark the message as read in the database
    logger.info(`Message ${messageId} in chat ${chatId} marked as read`);

    // Emit event to update unread counts or notify users
    socket.to(chatId).emit("messageRead", { messageId });
  });

  // Handle socket disconnection
  socket.on("disconnect", () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
};
