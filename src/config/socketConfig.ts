import type { Socket } from "socket.io";
import { Server as SocketIOServer } from "socket.io";
import type http from "http";
import logger from "./logging";
import { verifyJWT } from "../../src/utils/jwtUtils"; // JWT verification utility

// Define the shape of the user object
interface User {
  id: string;
  username: string;
}

// Extend the Socket.IO socket interface to include a `user` property
interface CustomSocket extends Socket {
  user?: User;
}

// Define the shape of the authentication payload
interface AuthPayload {
  token: string;
}

// Type guard to ensure TokenPayload matches User
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
    pingTimeout: 60000, // Timeout for inactive connections
  });

  // Middleware to authenticate users
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

      // Attach the user to the socket for later use
      socket.user = tokenPayload;
      logger.info(`Socket.IO connection authenticated for user ID: ${tokenPayload.id}`);
      next();
    } catch (error) {
      logger.error(`Socket.IO authentication error: ${error instanceof Error ? error.message : "Unknown error"}`);
      next(new Error("Authentication error"));
    }
  });

  // Handle socket connections
  io.on("connection", (socket: CustomSocket) => {
    const user = socket.user;
    if (!user) {
      logger.warn("User is not attached to the socket after authentication.");
      socket.disconnect(true);
      return;
    }

    logger.info(`User connected via WebSocket: ${user.id}`);

    // Handle a "chatMessage" event
    socket.on("chatMessage", (message: string) => {
      try {
        logger.info(`Received message from user ${user.id}: ${message}`);
        io.emit("chatMessage", { userId: user.id, message });
      } catch (error) {
        logger.error(`Error handling chatMessage: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });

    // Handle a "disconnect" event
    socket.on("disconnect", (reason: string) => {
      logger.info(`User ${user.id} disconnected: ${reason}`);
    });

    // Custom event handler for room joining
    socket.on("joinRoom", (room: string) => {
      try {
        void socket.join(room);
        logger.info(`User ${user.id} joined room: ${room}`);
        io.to(room).emit("roomMessage", `User ${user.id} has joined the room.`);
      } catch (error) {
        logger.error(`Error joining room: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });

    // Custom event handler for room leaving
    socket.on("leaveRoom", (room: string) => {
      try {
        void socket.leave(room);
        logger.info(`User ${user.id} left room: ${room}`);
        io.to(room).emit("roomMessage", `User ${user.id} has left the room.`);
      } catch (error) {
        logger.error(`Error leaving room: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    });
  });

  return io;
};

export default configureSocketIO;
