import type { Application } from "express";
import express from "express";
import mongoose from "mongoose";
import compression from "compression";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cron from "node-cron";
import cors from "cors";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

// ✅ Load Environment Variables
dotenv.config();

// ✅ Utilities
import { logger } from "./utils/winstonLogger";
import ReminderService from "./api/services/ReminderService";
import setupSwagger from "./config/swaggerConfig";

// ✅ Middleware
import { errorHandler } from "./api/middleware/errorHandler";
import { applySecurityMiddlewares } from "./config/securityConfig";
import { stripeRawBodyParser } from "../src/api/middleware/stripeWebhookParser";

// ✅ WebSocket Handlers
import setupSocketHandlers from "../src/sockets/setupSocketHandlers";

// ✅ Routes
import authRoutes from "./api/routes/auth";
import userRoutes from "./api/routes/user";
import groupRoutes from "./api/routes/group";
import chatRoutes from "./api/routes/chat";
import paymentRoutes from "./api/routes/payment";
import subscriptionRoutes from "./api/routes/subscription";
import goalRoutes from "./api/routes/goal";
import goalMessageRoutes from "./api/routes/goalMessage";
import friendsRoutes from "./api/routes/friends";
import blogRoutes from "./api/routes/blog";
import booksRoutes from "./api/routes/books";
import notificationsRoutes from "./api/routes/notifications";
import followRoutes from "./api/routes/follow";

import { handleStripeWebhook } from "./api/controllers/paymentController";

// 🚀 Startup Log
console.warn("🚀 Server is starting...");

// ✅ Validate Required Environment Variables
const requiredEnv = ["MONGO_URI", "PORT", "STRIPE_WEBHOOK_SECRET"];
requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    logger.error(`❌ Missing required environment variable: ${env}`);
    process.exit(1);
  }
});

// ✅ Ensure Uploads Directory Exists
const uploadDirs = ["uploads/profile", "uploads/covers"];
uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ✅ Initialize Express App
const app: Application = express();
const httpServer = createServer(app);

// ✅ Apply Security Middleware
app.use(helmet());
applySecurityMiddlewares(app);

// ✅ Rate Limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
}));

// ✅ CORS Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ✅ Stripe Raw Body Middleware
app.use(stripeRawBodyParser);

// ✅ Additional Middleware
app.use(express.json());
app.use(compression());

// ✅ API Routes
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
app.use("/api/follow", followRoutes);
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// ✅ Stripe Webhook Endpoint
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

// ✅ Global Error Handler
app.use(errorHandler);

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI as string, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  })
  .then(() => logger.info("✅ MongoDB connected successfully"))
  .catch((error: Error) => {
    logger.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  });

// ✅ WebSocket Setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
});

// ✅ Assign Socket Server to Global
declare global {
  var io: Server;
}
global.io = io;

// ✅ Handle WebSocket Events
setupSocketHandlers(io);

// ✅ Graceful Shutdown
const shutdown = async (): Promise<void> => {
  try {
    logger.info("🚀 Graceful shutdown initiated...");
    await mongoose.connection.close();
    logger.info("✅ MongoDB connection closed.");
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Error during shutdown: ${error}`);
    process.exit(1);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ✅ Reminder Scheduler
cron.schedule("* * * * *", async (): Promise<void> => {
  logger.info("🔔 Checking for reminders...");
  try {
    await ReminderService.checkReminders();
  } catch (err) {
    logger.error(`❌ Error during reminder check: ${(err as Error).message}`);
  }
});

// ✅ Unhandled Rejection & Exceptions
process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>): void => {
  logger.error(`❌ Unhandled Rejection at: ${promise}, reason: ${String(reason)}`);
  void shutdown();
});

process.on("uncaughtException", (error: Error): void => {
  logger.error(`❌ Uncaught Exception: ${error.message}`);
  void shutdown();
});

// ✅ Start the Server
const PORT = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(PORT, (): void => {
  logger.info(`🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});

// ✅ Initialize Swagger UI
setupSwagger(app);
