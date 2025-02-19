import type { Server, Socket } from "socket.io";
import Room from "../models/Room"; // Room model for database operations
import logger from "../utils/winstonLogger"; // Logger for tracking room events

interface RoomData {
  roomId?: string;
  name?: string;
  description?: string;
  isPrivate?: boolean;
}

/**
 * @desc    Handles WebSocket events related to room management.
 * @param   io - The socket.io server instance.
 * @param   socket - The socket object representing the client's connection.
 */
const roomManagementSocket = (io: Server, socket: Socket): void => {
  const userId = socket.data.user?.id as string; // Ensure user ID is retrieved properly
  if (!userId) {
    logger.error("User ID is missing. Disconnecting the socket.");
    socket.emit("error", { msg: "Authentication error: User ID is missing." });
    return;
  }

  /**
   * @desc    Creates a new chat room.
   * @param   roomData - The room data including name, description, and other options.
   */
  socket.on("createRoom", async (roomData: RoomData) => {
    try {
      const { name, description, isPrivate } = roomData;
  
      // Validate inputs
      if (!name || typeof name !== "string" || name.length < 3) {
        socket.emit("error", {
          msg: "Room name is required and must be at least 3 characters long.",
        });
        return; // Explicitly return to ensure no further execution
      }
  
      // Create a new room in the database
      const newRoom = await Room.create({
        name,
        description,
        isPrivate: !!isPrivate,
        createdBy: userId,
      });
  
      logger.info(`Room created: ${newRoom.name} by user ${userId}`);
      io.emit("roomCreated", newRoom); // Broadcast the new room to all connected clients
      return; // Explicitly return after successful execution
    } catch (error) {
      logger.error(`Error creating room: ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to create room." });
      return; // Explicitly return in case of an error
    }
  });
  

  /**
   * @desc    Joins an existing room.
   * @param   roomData - The room data including roomId.
   */
  socket.on("joinRoom", async (roomData: RoomData) => {
    try {
      const { roomId } = roomData;
  
      if (!roomId) {
        socket.emit("error", { msg: "Room ID is required to join a room." });
        return; // Explicitly return after emitting the error
      }
  
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit("error", { msg: "Room not found." });
        return; // Explicitly return after emitting the error
      }
  
      void socket.join(roomId);
      logger.info(`User ${userId} joined room ${roomId}`);
      socket.to(roomId).emit("userJoinedRoom", { userId, roomId });
  
      socket.emit("roomJoined", { roomId, roomName: room.name });
      return; // Explicitly return after successful execution
    } catch (error) {
      logger.error(`Error joining room: ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to join room." });
      return; // Explicitly return in case of an error
    }
  });
  
  /**
   * @desc    Leaves a room.
   * @param   roomData - The room data including roomId.
   */
  socket.on("leaveRoom", (roomData: RoomData) => {
    try {
      const { roomId } = roomData;
  
      if (!roomId) {
        socket.emit("error", { msg: "Room ID is required to leave a room." });
        return; // Explicitly return after emitting the error
      }
  
      void socket.leave(roomId);
      logger.info(`User ${userId} left room ${roomId}`);
      socket.to(roomId).emit("userLeftRoom", { userId, roomId });
  
      socket.emit("roomLeft", { roomId });
      return; // Explicitly return after successful execution
    } catch (error) {
      logger.error(`Error leaving room: ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to leave room." });
      return; // Explicitly return in case of an error
    }
  });
  

  /**
   * @desc    Deletes a room (for room admins or creators).
   * @param   roomData - The room data including roomId.
   */
  socket.on("deleteRoom", async (roomData: RoomData) => {
    try {
      const { roomId } = roomData;
  
      if (!roomId) {
        socket.emit("error", { msg: "Room ID is required to delete a room." });
        return; // Explicitly return after emitting the error
      }
  
      const room = await Room.findById(roomId);
      if (!room) {
        socket.emit("error", { msg: "Room not found." });
        return; // Explicitly return if the room is not found
      }
  
      if (room.createdBy.toString() !== userId) {
        socket.emit("error", { msg: "Access denied. You are not authorized to delete this room." });
        return; // Explicitly return if the user is not authorized
      }
  
      await Room.deleteOne({ _id: roomId }); // Use deleteOne instead of remove
      logger.info(`Room ${roomId} deleted by user ${userId}`);
      io.emit("roomDeleted", { roomId }); // Broadcast room deletion to all users
      return; // Explicitly return after successful deletion
    } catch (error) {
      logger.error(`Error deleting room: ${(error as Error).message}`);
      socket.emit("error", { msg: "Failed to delete room." });
      return; // Explicitly return in case of an error
    }
  });
  

  /**
   * @desc    Fetches a list of available rooms for the user.
   */
  socket.on("fetchRooms", async () => {
    try {
      const rooms = await Room.find({ isPrivate: false })
        .sort({ createdAt: -1 })
        .limit(20);

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

export default roomManagementSocket;
