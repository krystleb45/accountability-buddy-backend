import type { Server, Socket } from "socket.io";
import Chat from "../models/Chat"; // Chat model for storing messages
import Group from "../models/Group"; // Group model for managing groups
import User from "../models/User"; // User model for user details
import logger from "../utils/winstonLogger"; // Logger utility

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
  /**
   * Handle user joining a chat room
   */
  socket.on("joinRoom", async (data: JoinRoomData) => {
    try {
      const { roomId, userId } = data;
  
      if (!roomId || !userId) {
        socket.emit("error", "Room ID and User ID are required.");
        return; // Exit early if validation fails
      }
  
      const user = await User.findById(userId);
      if (!user) {
        socket.emit("error", "User not found.");
        return; // Exit early if user is not found
      }
  
      const room = await Group.findById(roomId);
      if (!room) {
        socket.emit("error", "Room not found.");
        return; // Exit early if room is not found
      }
  
      void socket.join(roomId);
      logger.info(`User ${userId} joined room ${roomId}`);
  
      socket.to(roomId).emit("userJoined", { userId, username: user.username, roomId });
      return; // Explicitly return at the end of the successful path
    } catch (error) {
      logger.error(`Error joining room: ${(error as Error).message}`);
      socket.emit("error", "Unable to join room.");
      return; // Explicitly return from the catch block
    }
  });
  

  /**
   * Handle user leaving a chat room
   */
  socket.on("leaveRoom", async (data: LeaveRoomData) => {
    try {
      const { roomId, userId } = data;
  
      if (!roomId || !userId) {
        socket.emit("error", "Room ID and User ID are required.");
        return; // Exit early if validation fails
      }
  
      const user = await User.findById(userId);
      if (!user) {
        socket.emit("error", "User not found.");
        return; // Exit early if user is not found
      }
  
      const room = await Group.findById(roomId);
      if (!room) {
        socket.emit("error", "Room not found.");
        return; // Exit early if room is not found
      }
  
      void socket.leave(roomId);
      logger.info(`User ${userId} left room ${roomId}`);
  
      // Notify others in the room that the user has left
      socket.to(roomId).emit("userLeft", { userId, username: user.username, roomId });
      return; // Explicitly return after successfully handling the event
    } catch (error) {
      logger.error(`Error leaving room: ${(error as Error).message}`);
      socket.emit("error", "Unable to leave room.");
      return; // Explicitly return from the catch block
    }
  });
  

  /**
   * Handle sending a message
   */
  socket.on("sendMessage", async (data: SendMessageData) => {
    try {
      const { roomId, userId, message } = data;
  
      if (!message || !roomId || !userId) {
        socket.emit("error", "Message, Room ID, and User ID are required.");
        return; // Exit early if validation fails
      }
  
      const user = await User.findById(userId);
      if (!user) {
        socket.emit("error", "User not found.");
        return; // Exit early if user is not found
      }
  
      const room = await Group.findById(roomId);
      if (!room) {
        socket.emit("error", "Room not found.");
        return; // Exit early if room is not found
      }
  
      const newMessage = await Chat.create({
        message,
        sender: userId,
        group: roomId,
        createdAt: new Date(),
      });
  
      io.to(roomId).emit("newMessage", {
        message: newMessage.message,
        sender: { id: user._id, username: user.username },
        roomId,
        createdAt: newMessage.createdAt,
      });
  
      logger.info(`Message sent by user ${user.username} in room ${roomId}`);
      return; // Explicitly return at the end of the successful path
    } catch (error) {
      logger.error(`Error sending message: ${(error as Error).message}`);
      socket.emit("error", "Unable to send message.");
      return; // Explicitly return from the catch block
    }
  });
  

  /**
   * Fetch chat history
   */
  socket.on("fetchChatHistory", async (data: FetchChatHistoryData) => {
    try {
      const { roomId } = data;
  
      if (!roomId) {
        socket.emit("error", "Room ID is required.");
        return; // Exit early if validation fails
      }
  
      const room = await Group.findById(roomId);
      if (!room) {
        socket.emit("error", "Room not found.");
        return; // Exit early if room is not found
      }
  
      const chatHistory = await Chat.find({ group: roomId })
        .populate("sender", "username")
        .sort({ createdAt: 1 });
  
      socket.emit("chatHistory", chatHistory);
      logger.info(`Fetched chat history for room ${roomId}`);
      return; // Explicitly return after successfully handling the event
    } catch (error) {
      logger.error(`Error fetching chat history: ${(error as Error).message}`);
      socket.emit("error", "Unable to fetch chat history.");
      return; // Explicitly return from the catch block
    }
  });
  

  /**
   * Handle user disconnection
   */
  socket.on("disconnect", () => {
    logger.info("A user disconnected.");
  });
};

export default chatSocket;
