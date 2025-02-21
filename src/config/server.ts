import type { Application } from "express";
import express from "express";
import mongoose from "mongoose";
import compression from "compression";
import { createServer } from "http";
import type { Socket } from "socket.io";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cron from "node-cron";

// Utilities
import logger from "../utils/winstonLogger";
import ReminderService from "../services/ReminderService";
import setupSwagger from "./swaggerConfig";

// Middleware
import { errorHandler } from "../middleware/errorHandler";
import { applySecurityMiddlewares } from "./securityConfig";

// Routes
import authRoutes from "../routes/auth";
import userRoutes from "../routes/user";
import groupRoutes from "../routes/group";
import chatRoutes from "../routes/chat";
import paymentRoutes from "../routes/payment";
import subscriptionRoutes from "../routes/subscription";
import goalRoutes from "../routes/goal";
import goalMessageRoutes from "../routes/goalMessage";
import friendsRoutes from "../routes/friends";
import blogRoutes from "../routes/blog";
import booksRoutes from "../routes/books";
import notificationsRoutes from "../routes/notifications";

// Load environment variables
dotenv.config();

// Ensure required environment variables are set
const requiredEnv = ["MONGO_URI", "PORT"];
requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    logger.error(`Missing required environment variable: ${env}`);
    process.exit(1);
  }
});

// Initialize Express App
const app: Application = express();
const httpServer = createServer(app);

// Apply Security Middleware (Helmet, CORS, Rate Limiting, XSS Protection, etc.)
applySecurityMiddlewares(app);

// Additional Middleware
app.use(compression());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/goal-messages", goalMessageRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/notifications", notificationsRoutes);

// Error Handling Middleware
app.use(errorHandler);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI as string, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  })
  .then(() => logger.info("MongoDB connected"))
  .catch((error: Error) => {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  });

// ✅ WebSockets (Socket.io) for Real-Time Features
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
});

// ✅ Assign `io` to Global Object (Fix TypeScript Errors)
declare global {
  var io: Server;
}
global.io = io;

// ✅ WebSocket Event Handling
io.on("connection", (socket: Socket): void => {
  logger.info(`WebSocket connected: ${socket.id}`);

  try {
    // ✅ Real-time Friend Requests
    socket.on("sendFriendRequest", ({ senderId, recipientId }) => {
      io.to(recipientId).emit("friendRequest", { senderId });
    });

    socket.on("acceptFriendRequest", ({ senderId, recipientId }) => {
      io.to(senderId).emit("friendAccepted", { recipientId });
    });

    // ✅ Real-time Chat Messages
    socket.on("chatMessage", ({ message, groupId, senderId }) => {
      io.to(groupId).emit("message", { message, senderId });
    });

    // ✅ Read Receipts (Mark messages as read)
    socket.on("markMessagesAsRead", ({ chatId, userId }) => {
      io.to(chatId).emit("messagesRead", { chatId, userId });
    });

    // ✅ Reactions (Send Message Reactions)
    socket.on("addReaction", ({ messageId, reaction, userId }) => {
      io.to(messageId).emit("reactionAdded", { messageId, reaction, userId });
    });

    // ✅ Join Chat Room (for group messages)
    socket.on("joinGroup", async (groupId) => {
      try {
        await socket.join(groupId);
        logger.info(`User joined group: ${groupId}`);
      } catch (error) {
        logger.error(`Error joining group ${groupId}: ${(error as Error).message}`);
      }
    });

    // ✅ Leave Chat Room
    socket.on("leaveGroup", async (groupId) => {
      try {
        await socket.leave(groupId);
        logger.info(`User left group: ${groupId}`);
      } catch (error) {
        logger.error(`Error leaving group ${groupId}: ${(error as Error).message}`);
      }
    });

    // ✅ Handle User Disconnection
    socket.on("disconnect", (): void => {
      logger.info(`WebSocket disconnected: ${socket.id}`);
    });
  } catch (error) {
    logger.error(`WebSocket error: ${(error as Error).message}`);
  }
});

// Graceful Shutdown
const shutdown = async (): Promise<void> => {
  try {
    logger.info("Graceful shutdown initiated...");
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");
    process.exit(0);
  } catch (error) {
    logger.error(`Error during shutdown: ${error}`);
    process.exit(1);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ✅ Scheduled Tasks (Runs Every Minute)
cron.schedule("* * * * *", async (): Promise<void> => {
  logger.info("Checking for reminders...");
  try {
    await ReminderService.checkReminders();
  } catch (err) {
    logger.error(`Error during reminder check: ${(err as Error).message}`);
  }
});

// ✅ Unhandled Errors & Exceptions
process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>): void => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${String(reason)}`);
  void shutdown();
});

process.on("uncaughtException", (error: Error): void => {
  logger.error(`Uncaught Exception: ${error.message}`);
  void shutdown();
});

// ✅ Start the Server
const PORT = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(PORT, (): void => {
  logger.info(
    `Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`,
  );
});

// ✅ Initialize Swagger UI
setupSwagger(app);
