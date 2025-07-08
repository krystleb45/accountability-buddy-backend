// src/sockets/anonymousMilitaryChat.ts
import type { Server, Socket } from "socket.io";
import { logger } from "../utils/winstonLogger";

interface AnonymousUser {
  sessionId: string;
  displayName: string;
  roomId?: string;
}

// Store active users per room
const activeUsers = new Map<string, Set<AnonymousUser>>();

export function setupAnonymousMilitaryChat(io: Server): void {
  // Create anonymous military chat namespace (no auth required)
  const anonymousChatNamespace = io.of("/anonymous-military-chat");

  anonymousChatNamespace.on("connection", (socket: Socket) => {
    logger.info(`👋 Anonymous user connected: ${socket.id}`);

    const user: AnonymousUser = {
      sessionId: socket.handshake.auth.sessionId || socket.id,
      displayName: socket.handshake.auth.displayName || "Anonymous User"
    };

    // Handle joining a room
    socket.on("join-room", async (data: { room: string; sessionId: string; displayName: string }) => {
      const { room, sessionId, displayName } = data;

      logger.info(`👥 Anonymous user ${displayName} joining room: ${room}`);

      // Join the Socket.IO room
      await socket.join(room);
      user.roomId = room;
      user.sessionId = sessionId;
      user.displayName = displayName;


      // Add user to active users for this room
      if (!activeUsers.has(room)) {
        activeUsers.set(room, new Set());
      }
      activeUsers.get(room)!.add(user);

      const memberCount = activeUsers.get(room)!.size;

      // Notify user they joined successfully
      socket.emit("joined-successfully", { memberCount });

      // Notify room about new member
      socket.to(room).emit("user-joined", {
        message: `${displayName} joined the room`,
        memberCount
      });

      // Update member count for everyone in room
      anonymousChatNamespace.to(room).emit("member-count-updated", { memberCount });

      logger.info(`📊 Anonymous room ${room} now has ${memberCount} members`);
    });

    // Handle sending messages
    socket.on("send-message", (data: { room: string; message: string; sessionId: string; displayName: string }) => {
      const { room, message, displayName } = data;
      logger.info(`💬 Anonymous message from ${displayName} in ${room}: ${message}`);

      // Check for crisis keywords
      const crisisKeywords = ["suicide", "kill myself", "end it all", "hurt myself", "die", "want to die"];
      const messageContainsCrisisKeywords = crisisKeywords.some(keyword =>
        message.toLowerCase().includes(keyword)
      );

      if (messageContainsCrisisKeywords) {
        logger.warn(`🚨 Crisis keywords detected from ${displayName} in ${room}`);

        // Send crisis resources to the user
        socket.emit("crisis-resources", {
          message: "We noticed you might be in distress. Please reach out for help: Veterans Crisis Line 988 (Press 1) or emergency services 911.",
          resources: {
            veteransCrisis: "988",
            emergency: "911",
            textLine: "838255"
          }
        });
      }

      const messageData = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        displayName,
        message: message.trim(),
        timestamp: new Date().toISOString(),
        isFlagged: messageContainsCrisisKeywords
      };

      // Send message to everyone in the room
      anonymousChatNamespace.to(room).emit("new-message", messageData);
    });

    // Handle leaving room
    socket.on("leave-room", async (data: { room: string; sessionId: string; displayName: string }) => {
      const { room, sessionId, displayName } = data;

      logger.info(`👋 Anonymous user ${displayName} leaving room: ${room}`);

      try {
        await socket.leave(room);
      } catch (error) {
        logger.error(`Error leaving room: ${error}`);
      }

      // Remove user from active users
      if (activeUsers.has(room)) {
        const roomUsers = activeUsers.get(room)!;
        // Find and remove user by sessionId
        for (const user of roomUsers) {
          if (user.sessionId === sessionId) {
            roomUsers.delete(user);
            break;
          }
        }

        const memberCount = roomUsers.size;

        // Notify room about user leaving
        socket.to(room).emit("user-left", {
          message: `${displayName} left the room`,
          memberCount
        });

        // Update member count
        anonymousChatNamespace.to(room).emit("member-count-updated", { memberCount });

        logger.info(`📊 Anonymous room ${room} now has ${memberCount} members`);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      logger.info(`❌ Anonymous user disconnected: ${socket.id}`);

      // Remove from all rooms
      if (user.roomId && activeUsers.has(user.roomId)) {
        const roomUsers = activeUsers.get(user.roomId)!;
        roomUsers.delete(user);

        const memberCount = roomUsers.size;

        // Update member count for remaining users
        anonymousChatNamespace.to(user.roomId).emit("member-count-updated", { memberCount });

        logger.info(`📊 Anonymous room ${user.roomId} now has ${memberCount} members after disconnect`);
      }
    });
  });

  logger.info("💬 Anonymous military chat namespace initialized");
}
