import type { Server, Socket } from "socket.io";
import logger from "../utils/winstonLogger"; // Import your logger utility

interface TypingData {
  roomId: string;
}

/**
 * @desc    Handles WebSocket events related to typing indicators.
 * @param   {Server} _io - The socket.io server instance.
 * @param   {Socket} socket - The socket object representing the client's connection.
 */
const typingIndicatorSocket = (_io: Server, socket: Socket): void => {
  const userId = socket.data.user?.id as string; // Correct user ID retrieval
  if (!userId) {
    logger.error("Socket connection attempted without a valid user ID.");
    socket.emit("error", { msg: "Authentication error: User ID is missing or invalid." });
    return;
  }

  /**
   * @desc    Handles the 'startTyping' event, broadcasting to others in the same room.
   */
  socket.on("startTyping", (typingData: TypingData): void => {
    try {
      const { roomId } = typingData;

      if (!roomId) {
        socket.emit("error", { msg: "Room ID is required to start typing." });
        return;
      }

      // Broadcast to other users in the room that this user has started typing
      socket.to(roomId).emit("userTyping", { userId, roomId, typing: true });
      logger.info(`User ${userId} started typing in room ${roomId}`);
    } catch (error) {
      logger.error(`Error processing 'startTyping': ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to process start typing event." });
    }
  });

  /**
   * @desc    Handles the 'stopTyping' event, broadcasting to others in the same room.
   */
  socket.on("stopTyping", (typingData: TypingData): void => {
    try {
      const { roomId } = typingData;

      if (!roomId) {
        socket.emit("error", { msg: "Room ID is required to stop typing." });
        return;
      }

      // Broadcast to other users in the room that this user has stopped typing
      socket.to(roomId).emit("userTyping", { userId, roomId, typing: false });
      logger.info(`User ${userId} stopped typing in room ${roomId}`);
    } catch (error) {
      logger.error(`Error processing 'stopTyping': ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to process stop typing event." });
    }
  });

  /**
   * @desc    Handles user disconnection, ensuring that typing indicators are cleared.
   */
  socket.on("disconnect", (): void => {
    try {
      logger.info(`User ${userId} disconnected from typing indicator management`);

      // Broadcast that the user has stopped typing in all rooms they were part of
      socket.rooms.forEach((roomId) => {
        socket.to(roomId).emit("userTyping", { userId, roomId, typing: false });
      });
    } catch (error) {
      logger.error(`Error during user disconnection: ${(error as Error).message}`);
    }
  });
};

export default typingIndicatorSocket;
