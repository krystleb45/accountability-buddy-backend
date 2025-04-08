import type { Server, Socket } from "socket.io";
import { logger } from "../utils/winstonLogger";

interface FriendRequestPayload {
  senderId: string;
  recipientId: string;
}

interface ChatMessagePayload {
  message: string;
  groupId: string;
  senderId: string;
}

interface MessagesReadPayload {
  chatId: string;
  userId: string;
}

export default function setupSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket): void => {
    logger.info(`WebSocket connected: ${socket.id}`);

    try {
      socket.on("sendFriendRequest", ({ senderId, recipientId }: FriendRequestPayload) => {
        io.to(recipientId).emit("friendRequest", { senderId });
      });

      socket.on("acceptFriendRequest", ({ senderId, recipientId }: FriendRequestPayload) => {
        io.to(senderId).emit("friendAccepted", { recipientId });
      });

      socket.on("chatMessage", ({ message, groupId, senderId }: ChatMessagePayload) => {
        io.to(groupId).emit("message", { message, senderId });
      });

      socket.on("markMessagesAsRead", ({ chatId, userId }: MessagesReadPayload) => {
        io.to(chatId).emit("messagesRead", { chatId, userId });
      });

      socket.on("disconnect", (): void => {
        logger.info(`WebSocket disconnected: ${socket.id}`);
      });
    } catch (error) {
      logger.error(`WebSocket error: ${(error as Error).message}`);
    }
  });
}
