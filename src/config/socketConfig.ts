// src/config/socketConfig.ts

import type http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import mongoose from "mongoose";
import logger from "./logging";
import { verifyJWT } from "../api/utils/jwtUtils";
import Chat from "../api/models/Chat";
import Message from "../api/models/Message";

// Define the user shape
interface UserPayload {
  id: string;
  username: string;
}

// Extend Socket.IO’s Socket to carry our `user`
interface CustomSocket extends Socket {
  user?: UserPayload;
}

// Type guard for our JWT payload
const isUserPayload = (payload: any): payload is UserPayload => {
  return typeof payload.id === "string" && typeof payload.username === "string";
};

const configureSocketIO = (httpServer: http.Server): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Authentication middleware
  io.use(async (socket: CustomSocket, next) => {
    try {
      const { token } = socket.handshake.auth as { token?: string };
      if (!token) {
        logger.warn("Socket connection attempt without token");
        return next(new Error("Authentication error"));
      }
      const decoded = verifyJWT(token);
      if (!decoded || !isUserPayload(decoded)) {
        logger.warn("Invalid socket auth token");
        return next(new Error("Authentication error"));
      }
      socket.user = decoded;
      next();
    } catch (err) {
      logger.error("Socket auth middleware error", err);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket: CustomSocket) => {
    const user = socket.user!;
    logger.info(`User connected via WebSocket: ${user.id}`);

    // join personal room
    void socket.join(user.id);

    // join/leave rooms
    socket.on("joinRoom", async (room: string) => {
      try {
        await socket.join(room);
        io.to(room).emit("roomMessage", `${user.username} has joined.`);
      } catch (err) {
        logger.error("Error joining room", err);
      }
    });

    socket.on("leaveRoom", async (room: string) => {
      try {
        await socket.leave(room);
        io.to(room).emit("roomMessage", `${user.username} has left.`);
      } catch (err) {
        logger.error("Error leaving room", err);
      }
    });

    // send message
    socket.on("sendMessage", async (data: { chatId: string; message: string }) => {
      try {
        const newMessage = new Message({
          chatId: data.chatId,
          senderId: user.id,
          text: data.message,
          messageType: "private",
          status: "sent",
        });
        await newMessage.save();

        await Chat.findByIdAndUpdate(data.chatId, { lastMessage: newMessage._id });

        io.to(data.chatId).emit("receiveMessage", {
          chatId: data.chatId,
          senderId: user.id,
          message: data.message,
          timestamp: newMessage.timestamp,
          status: "sent",
        });
      } catch (err) {
        logger.error("Error sending message", err);
      }
    });

    // reactions
    socket.on("addReaction", async (data: { messageId: string; reaction: string }) => {
      try {
        const msg = await Message.findById(data.messageId);
        if (!msg) return;

        // remove old, then add new, *mutating the DocumentArray in place*
        const filtered = msg.reactions.filter((r) => r.userId.toString() !== user.id);
        msg.reactions.splice(0, msg.reactions.length, ...filtered);
        msg.reactions.push({
          userId: new mongoose.Types.ObjectId(user.id),
          emoji: data.reaction,
        });

        await msg.save();

        io.to(msg.chatId.toString()).emit("reactionAdded", {
          messageId: msg._id.toString(),
          reaction: data.reaction,
          userId: user.id,
        });
      } catch (err) {
        logger.error("Error adding reaction", err);
      }
    });

    // typing indicators
    socket.on("typing", (chatId: string) => {
      socket.to(chatId).emit("userTyping", { chatId, userId: user.id, username: user.username });
    });
    socket.on("stopTyping", (chatId: string) => {
      socket.to(chatId).emit("userStoppedTyping", { chatId, userId: user.id });
    });

    // read receipts
    socket.on("markAsRead", async ({ chatId }: { chatId: string }) => {
      try {
        await Message.updateMany({ chatId, status: { $ne: "seen" } }, { status: "seen" });
        io.to(chatId).emit("messageRead", { chatId, userId: user.id });
      } catch (err) {
        logger.error("Error marking messages read", err);
      }
    });

    socket.on("disconnect", (reason) => {
      logger.info(`User ${user.id} disconnected: ${reason}`);
    });
  });

  return io;
};

export default configureSocketIO;
