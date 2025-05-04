// src/sockets/chat.ts
import type { Server, Socket } from "socket.io";
import Chat from "../api/models/Chat";
import Group from "../api/models/Group";      // ← fixed import
import { User } from "../api/models/User";
import { logger } from "../utils/winstonLogger";

interface JoinRoomData {
  roomId: string;
  userId: string;
}

interface LeaveRoomData {
  roomId: string;
  userId: string;
}

interface SendMessageData {
  roomId: string;
  userId: string;
  message: string;
}

interface FetchChatHistoryData {
  roomId: string;
}

const chatSocket = (io: Server, socket: Socket): void => {
  socket.on("joinRoom", async (data: JoinRoomData) => {
    const { roomId, userId } = data;
    if (!roomId || !userId) {
      socket.emit("error", "Room ID and User ID are required.");
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      socket.emit("error", "User not found.");
      return;
    }

    const room = await Group.findById(roomId);
    if (!room) {
      socket.emit("error", "Room not found.");
      return;
    }

    // join returns a promise in some adapters, so we can await it or void it:
    void socket.join(roomId);
    logger.info(`User ${userId} joined room ${roomId}`);
    socket.to(roomId).emit("userJoined", { userId, username: user.username, roomId });
  });

  socket.on("leaveRoom", async (data: LeaveRoomData) => {
    const { roomId, userId } = data;
    if (!roomId || !userId) {
      socket.emit("error", "Room ID and User ID are required.");
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      socket.emit("error", "User not found.");
      return;
    }

    const room = await Group.findById(roomId);
    if (!room) {
      socket.emit("error", "Room not found.");
      return;
    }

    void socket.leave(roomId);
    logger.info(`User ${userId} left room ${roomId}`);
    socket.to(roomId).emit("userLeft", { userId, username: user.username, roomId });
  });

  socket.on("sendMessage", async (data: SendMessageData) => {
    const { roomId, userId, message } = data;
    if (!message || !roomId || !userId) {
      socket.emit("error", "Message, Room ID, and User ID are required.");
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      socket.emit("error", "User not found.");
      return;
    }

    const room = await Group.findById(roomId);
    if (!room) {
      socket.emit("error", "Room not found.");
      return;
    }

    const newMessage = await Chat.create({
      message,
      sender: userId,
      group: roomId,
      createdAt: new Date(),
    });

    io.to(roomId).emit("newMessage", {
      messages: newMessage.messages,   // ← use `messages` (per your schema)
      sender: { id: user._id.toString(), username: user.username },
      roomId,
      createdAt: newMessage.createdAt,
    });

    logger.info(`Message sent by user ${user.username} in room ${roomId}`);
  });

  socket.on("fetchChatHistory", async (data: FetchChatHistoryData) => {
    const { roomId } = data;
    if (!roomId) {
      socket.emit("error", "Room ID is required.");
      return;
    }

    const room = await Group.findById(roomId);
    if (!room) {
      socket.emit("error", "Room not found.");
      return;
    }

    const chatHistory = await Chat.find({ group: roomId })
      .populate("sender", "username")
      .sort({ createdAt: 1 })
      .lean();

    socket.emit("chatHistory", chatHistory);
    logger.info(`Fetched chat history for room ${roomId}`);
  });

  socket.on("disconnect", () => {
    logger.info("A user disconnected.");
  });
};

export default chatSocket;
