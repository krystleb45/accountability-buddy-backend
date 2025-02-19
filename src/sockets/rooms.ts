import type { Server, Socket } from "socket.io";
import Room from "../models/Room"; // Room model for database operations
import logger from "../utils/winstonLogger"; // Logger for tracking room events
import mongoose from "mongoose";


interface RoomData {
  roomId?: string;
  name?: string;
  description?: string;
  isPrivate?: boolean;
}

/**
 * @desc    Handles WebSocket events related to chat room interactions.
 * @param   io - The socket.io server instance.
 * @param   socket - The socket object representing the client's connection.
 */
const roomSocket = (io: Server, socket: Socket): void => {
  const userId = socket.data.user?.id as string; // Ensure user ID is retrieved properly
  if (!userId) {
    logger.error("Socket connection attempted without a valid user ID.");
    socket.emit("error", { msg: "Authentication error: User ID is missing or invalid." });
    return;
  }

  /**
   * @desc    Creates a new room.
   */
  socket.on("createRoom", async (roomData: RoomData) => {
    try {
      const { name, description, isPrivate } = roomData;

      if (!name || typeof name !== "string" || name.length < 3) {
        socket.emit("error", {
          msg: "Room name is required and must be at least 3 characters long.",
        });
        return;
      }

      const newRoom = await Room.create({
        name,
        description,
        isPrivate: !!isPrivate,
        createdBy: userId,
        members: [userId], // Add the creator to the members list
      });

      logger.info(`Room created: ${newRoom.name} by user ${userId}`);
      socket.emit("roomCreated", newRoom); // Confirm room creation to the user
      if (!newRoom.isPrivate) io.emit("newRoom", newRoom); // Broadcast public room to all users
    } catch (error) {
      logger.error(`Error creating room: ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to create room." });
    }
  });

  /**
   * @desc    Joins an existing room.
   */
  socket.on("joinRoom", async (roomData: RoomData) => {
    try {
      const { roomId } = roomData;
  
      if (!roomId) {
        socket.emit("error", { msg: "Room ID is required to join a room." });
        return;
      }
  
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit("error", { msg: "Room not found." });
        return;
      }
  
      const userObjectId = new mongoose.Types.ObjectId(userId); // Convert userId to ObjectId
  
      if (!room.members.some((member) => member.equals(userObjectId))) { // Use `.equals()` for ObjectId comparison
        room.members.push(userObjectId); // Push as ObjectId
        await room.save();
      }
  
      void socket.join(roomId);
      logger.info(`User ${userId} joined room ${roomId}`);
      socket.to(roomId).emit("userJoinedRoom", { userId, roomId });
      socket.emit("roomJoined", { roomId, roomName: room.name });
    } catch (error) {
      logger.error(`Error joining room: ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to join room." });
    }
  });

  /**
   * @desc    Leaves a room.
   */
  socket.on("leaveRoom", async (roomData: RoomData) => {
    try {
      const { roomId } = roomData;

      if (!roomId) {
        socket.emit("error", { msg: "Room ID is required to leave a room." });
        return;
      }

      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit("error", { msg: "Room not found." });
        return;
      }

      room.members = room.members.filter((member) => member.toString() !== userId);
      await room.save();

      void socket.leave(roomId);
      logger.info(`User ${userId} left room ${roomId}`);
      socket.to(roomId).emit("userLeftRoom", { userId, roomId });
      socket.emit("roomLeft", { roomId });
    } catch (error) {
      logger.error(`Error leaving room: ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to leave room." });
    }
  });

  /**
   * @desc    Fetches a list of available rooms.
   */
  socket.on("fetchRooms", async () => {
    try {
      const rooms = await Room.find({
        $or: [{ isPrivate: false }, { members: userId }],
      })
        .sort({ createdAt: -1 })
        .limit(20); // Limit results for scalability

      socket.emit("roomsList", rooms);
    } catch (error) {
      logger.error(`Error fetching rooms: ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to fetch rooms." });
    }
  });

  /**
   * @desc    Handles disconnection from room management.
   */
  socket.on("disconnect", () => {
    logger.info(`User ${userId} disconnected from room management`);
  });
};

export default roomSocket;
