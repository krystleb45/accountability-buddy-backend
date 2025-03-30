import type { Socket } from "socket.io";
import { Server as SocketIOServer } from "socket.io";
import type http from "http";
import logger from "../api/config/logging";
import { verifyJWT } from "../api/utils/jwtUtils";
import Chat from "../api/models/Chat";
import Message from "../api/models/Message";
import { User } from "../api/models/User";
import mongoose from "mongoose";

// Define the user shape
interface User {
  id: string;
  username: string;
}

// Extend Socket.IO to include a `user` property
interface CustomSocket extends Socket {
  user?: User;
}

// Define the authentication payload structure
interface AuthPayload {
  token: string;
}

// Type guard to validate user payload
const isUser = (payload: any): payload is User => {
  return typeof payload.id === "string" && typeof payload.username === "string";
};

// Configure Socket.IO
const configureSocketIO = (httpServer: http.Server): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000, // Auto-disconnect after inactivity
  });

  // ✅ Middleware for user authentication
  io.use(async (socket: CustomSocket, next) => {
    try {
      const payload = socket.handshake.auth as AuthPayload;
      if (!payload || !payload.token) {
        logger.warn("Socket connection attempt without authentication token");
        return next(new Error("Authentication error"));
      }

      const tokenPayload = verifyJWT(payload.token);
      if (!tokenPayload || !isUser(tokenPayload)) {
        logger.warn("Invalid authentication token during Socket.IO connection");
        return next(new Error("Authentication error"));
      }

      socket.user = tokenPayload;
      logger.info(`Socket.IO authenticated for user ID: ${tokenPayload.id}`);
      next();
    } catch (error) {
      logger.error(`Socket.IO authentication error: ${error instanceof Error ? error.message : "Unknown error"}`);
      next(new Error("Authentication error"));
    }
  });

  // ✅ Handle socket connections
  io.on("connection", async (socket: CustomSocket) => {
    const user = socket.user;
    if (!user) {
      logger.warn("User is not attached to the socket after authentication.");
      socket.disconnect(true);
      return;
    }

    logger.info(`User connected via WebSocket: ${user.id}`);
    await socket.join(user.id); // Auto-join personal room for DMs

    // ✅ Handle joining a chat room
    socket.on("joinRoom", async (room: string) => {
      try {
        await socket.join(room);
        logger.info(`User ${user.id} joined room: ${room}`);
        io.to(room).emit("roomMessage", `${user.username} has joined.`);
      } catch (error) {
        logger.error(`Error joining room: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });

    // ✅ Handle leaving a chat room
    socket.on("leaveRoom", async (room: string) => {
      try {
        await socket.leave(room);
        logger.info(`User ${user.id} left room: ${room}`);
        io.to(room).emit("roomMessage", `${user.username} has left.`);
      } catch (error) {
        logger.error(`Error leaving room: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });

    // ✅ Handle sending messages (private & group)
    socket.on("sendMessage", async (data: { chatId: string; message: string }) => {
      try {
        if (!data.chatId || !data.message) return;

        const newMessage = new Message({
          chatId: data.chatId,
          senderId: user.id,
          text: data.message,
          messageType: "private", // Change to "group" if needed
          status: "sent",
        });

        await newMessage.save();

        // ✅ Update last message in chat
        await Chat.findByIdAndUpdate(data.chatId, { lastMessage: newMessage._id });

        // ✅ Emit message event
        io.to(data.chatId).emit("receiveMessage", {
          chatId: data.chatId,
          senderId: user.id,
          message: data.message,
          timestamp: newMessage.timestamp,
          status: "sent",
        });

        logger.info(`Message sent in chat ${data.chatId} by ${user.id}`);
      } catch (error) {
        logger.error(`Error sending message: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });

    // ✅ Handle message reactions
    socket.on("addReaction", async (data: { messageId: string; reaction: string }) => {
      try {
        const message = await Message.findById(data.messageId);
        if (!message) return;

        // Remove previous reaction if exists
        message.reactions = message.reactions.filter((r) => r.userId.toString() !== user.id);
        message.reactions.push({ userId: new mongoose.Types.ObjectId(user.id), emoji: data.reaction });

        await message.save();

        io.to(message.chatId.toString()).emit("reactionAdded", {
          messageId: (message._id as mongoose.Types.ObjectId).toString(),          reaction: data.reaction,
          userId: user.id,
        });

        logger.info(`User ${user.id} reacted to message ${data.messageId} with ${data.reaction}`);
      } catch (error) {
        logger.error(`Error adding reaction: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });

    // ✅ Handle typing indicators
    socket.on("typing", (chatId: string) => {
      socket.to(chatId).emit("userTyping", { chatId, userId: user.id, username: user.username });
    });

    // ✅ Handle stop typing event
    socket.on("stopTyping", (chatId: string) => {
      socket.to(chatId).emit("userStoppedTyping", { chatId, userId: user.id });
    });

    // ✅ Handle read receipts
    socket.on("markAsRead", async ({ chatId }: { chatId: string }) => {
      try {
        await Message.updateMany({ chatId, status: { $ne: "seen" } }, { $set: { status: "seen" } });
        io.to(chatId).emit("messageRead", { chatId, userId: user.id });
      } catch (error) {
        logger.error(`Error marking messages as read: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });

    // ✅ Handle user disconnect
    socket.on("disconnect", (reason: string) => {
      logger.info(`User ${user.id} disconnected: ${reason}`);
    });
  });

  return io;
};

export default configureSocketIO;
