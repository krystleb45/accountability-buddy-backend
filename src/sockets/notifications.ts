import type { Server as HttpServer } from "http";
import type { Socket } from "socket.io";
import { Server } from "socket.io";
import chatSocket from "./chat"; // Chat event handlers
import type { INotification } from "../api/models/Notification";
import Notification from "../api/models/Notification";
import AuthService from "../api/services/AuthService"; // for verifyToken
import { logger } from "../utils/winstonLogger";

interface DecodedToken {
  user: {
    id: string;
    username: string;
  };
}

const notificationSocket = (server: HttpServer): Server => {
  const io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authenticate each incoming socket
  io.use(async (socket: Socket, next) => {
    try {
      // grab either query token or Authorization header
      const raw =
        socket.handshake.query.token ||
        socket.handshake.headers["authorization"];
      if (!raw) {
        logger.warn("Socket auth failed: no token");
        return next(new Error("Authentication error: No token provided."));
      }

      const token = Array.isArray(raw) ? raw[0] : raw;
      // ─── HERE: await the Promise<JwtPayload> ─────────────────
      const payload = await AuthService.verifyToken(token);
      // now assert it really has { user: { id, username } }
      const decoded = payload as unknown as DecodedToken;

      socket.data.user = decoded.user;
      next();
    } catch (err) {
      logger.error(`Socket auth error: ${(err as Error).message}`);
      next(new Error("Authentication error: Invalid token."));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.user?.id as string;
    logger.info(`User connected for notifications: ${userId}`);

    // Attach chat handlers too
    chatSocket(io, socket);

    // Fetch all notifications
    socket.on("fetchNotifications", async () => {
      try {
        const items: INotification[] = await Notification.find({ user: userId })
          .sort({ createdAt: -1 })
          .lean()
          .exec();
        socket.emit("notifications", items);
      } catch (err) {
        logger.error(`Fetch notifications error: ${(err as Error).message}`);
        socket.emit("error", "Failed to fetch notifications.");
      }
    });

    // Mark one as read
    socket.on("markAsRead", async (notificationId: string) => {
      try {
        if (!notificationId) {
          socket.emit("error", "Notification ID is required.");
          return;
        }
        const note = await Notification.findById(notificationId);
        if (!note || note.user.toString() !== userId) {
          socket.emit("error", "Not found or unauthorized.");
          return;
        }
        note.read = true;
        await note.save();
        socket.emit("notificationUpdated", note);
      } catch (err) {
        logger.error(`Mark read error: ${(err as Error).message}`);
        socket.emit("error", "Failed to mark notification as read.");
      }
    });

    // Broadcast new notification
    socket.on("newNotification", (payload: INotification) => {
      try {
        if (payload.user.toString() === userId) {
          socket.emit("newNotification", payload);
        } else {
          socket.emit("error", "Unauthorized notification.");
        }
      } catch (err) {
        logger.error(`New notification error: ${(err as Error).message}`);
        socket.emit("error", "Failed to send new notification.");
      }
    });

    socket.on("disconnect", () => {
      logger.info(`User disconnected from notifications: ${userId}`);
    });
  });

  return io;
};

export default notificationSocket;
