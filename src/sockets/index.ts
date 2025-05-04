// src/sockets/index.ts
import type { Server as HttpServer } from "http";
// `Server` is used at runtime, so it must be a normal import:
import { Server, Socket } from "socket.io";
import chatSocket from "./chat";
import Notification from "../api/models/Notification";
import AuthService from "../api/services/AuthService";
import { logger } from "../utils/winstonLogger";

interface DecodedToken {
  userId: string;
  role: string;
}

const socketServer = (server: HttpServer): Server => {
  const io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  /**
   * @desc    Middleware to authenticate WebSocket connections using JWT.
   */
  io.use(async (socket: Socket, next) => {
    try {
      // Support token via query or Authorization header
      const rawToken =
        (socket.handshake.query.token as string) ||
        (socket.handshake.headers["authorization"] as string);

      if (!rawToken) {
        logger.warn("Socket connection attempted without a token.");
        return next(new Error("Authentication error: No token provided."));
      }
      // If header format is "Bearer <token>", strip the "Bearer " prefix
      const token = rawToken.startsWith("Bearer ")
        ? rawToken.slice(7)
        : rawToken;

      // VERIFY the JWT
      const decoded = (await AuthService.verifyToken(token)) as DecodedToken;
      if (!decoded.userId) {
        throw new Error("Invalid token payload");
      }

      // Attach user data to the socket instance
      socket.data.user = { id: decoded.userId, role: decoded.role };
      next();
    } catch (error) {
      logger.error(`Socket authentication failed: ${(error as Error).message}`);
      next(new Error("Authentication error: Invalid token."));
    }
  });

  /**
   * @desc    Handles new socket connections.
   */
  io.on("connection", (socket: Socket) => {
    const { id: userId } = socket.data.user as { id: string; role: string };
    logger.info(`User connected: ${userId}`);

    // Attach chat-specific event handlers
    chatSocket(io, socket);

    /**
     * @desc    Fetches notifications for the connected user.
     */
    socket.on("fetchNotifications", async () => {
      try {
        const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
        socket.emit("notifications", notifications);
      } catch (err) {
        logger.error(`Error fetching notifications for user ${userId}: ${(err as Error).message}`);
        socket.emit("error", "Unable to fetch notifications.");
      }
    });

    /**
     * @desc    Handles new notifications.
     * @param   notification - The notification data to emit.
     */
    socket.on("newNotification", (notification: { userId: string; message: string }) => {
      if (notification && notification.userId) {
        io.to(notification.userId).emit("newNotification", notification);
      } else {
        logger.warn("Invalid notification data received.");
        socket.emit("error", "Invalid notification data.");
      }
    });

    /**
     * @desc    Handles user disconnection.
     */
    socket.on("disconnect", (reason) => {
      logger.info(`User disconnected: ${userId} (${reason})`);
    });
  });

  return io;
};

export default socketServer;
