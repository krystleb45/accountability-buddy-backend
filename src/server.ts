import dotenvFlow from "dotenv-flow";
dotenvFlow.config(); // Load env vars based on NODE_ENV

import { validateEnv } from "./utils/validateEnv";
validateEnv(); // ✅ stop boot if critical vars are missing

import { loadSecretsFromAWS } from "./utils/loadSecrets";
import type { Application, Request, Response } from "express";
import express from "express";
import mongoose from "mongoose";
import compression from "compression";
import { createServer } from "http";
import { Server } from "socket.io";
declare global {

  var io: Server;
}
import cron from "node-cron";
import cors from "cors";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { logger } from "./utils/winstonLogger";
import ReminderService from "./api/services/ReminderService";
import setupSwagger from "./config/swaggerConfig";
import { errorHandler } from "./api/middleware/errorHandler";
import { applySecurityMiddlewares } from "./config/securityConfig";
import { stripeRawBodyParser } from "./api/middleware/stripeWebhookParser";

import setupSocketHandlers from "./sockets/setupSocketHandlers";

import authRoutes from "./api/routes/auth";
import userRoutes from "./api/routes/user";
import { authenticateJwt } from "./api/middleware/authJwt";
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
import adminRoutes from "./api/routes/adminRoutes";
import { handleStripeWebhook } from "./api/controllers/paymentController";
import recommendationRoutes from "./api/routes/recommendationRoutes";

void (async (): Promise<void> => {
  try {
    if (process.env.NODE_ENV === "production") {
      await loadSecretsFromAWS();
    }

    console.warn("🚀 Server is starting...");

    const requiredEnv = ["MONGO_URI", "PORT", "STRIPE_WEBHOOK_SECRET"];
    requiredEnv.forEach((env) => {
      if (!process.env[env]) {
        logger.error(`❌ Missing required environment variable: ${env}`);
        process.exit(1);
      }
    });

    const uploadDirs = ["uploads/profile", "uploads/covers"];
    uploadDirs.forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const app: Application = express();
    const httpServer = createServer(app);

    app.use(helmet());
    applySecurityMiddlewares(app);
    app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
    app.use(
      cors({
        origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
      })
    );
    app.use(stripeRawBodyParser);
    app.use(express.json());
    app.use((req, _res, next) => {
      const cookies = req.headers.cookie || "";
      if (cookies.includes("next-auth.session-token")) {
        logger.debug("🔑 Session cookie received:", cookies);
      }
      next();
    });

    // ─── JWT‑Auth Middleware ────────────────────────────────────────────────
    // Every /api/* will now attempt to decode a Bearer token and set req.user.id
    app.use("/api", authenticateJwt);

    app.use(compression());

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
    app.use("/api/admin", adminRoutes);
    app.use("/api/recommendations", recommendationRoutes);


    app.get("/api/health", (_req: Request, res: Response) => {
      res.status(200).json({ status: "ok" });
    });

    app.post("/api/payments/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
    app.use(errorHandler);

    logger.debug(`Connecting to MongoDB with URI: ${process.env.MONGO_URI}`);
    await mongoose.connect(process.env.MONGO_URI as string, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
    });
    logger.info("✅ MongoDB connected successfully");

    const io = new Server(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
    });

    global.io = io;
    setupSocketHandlers(io);

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

    cron.schedule("* * * * *", async (): Promise<void> => {
      logger.info("🔔 Checking for reminders...");
      try {
        await ReminderService.checkReminders();
      } catch (err) {
        logger.error(`❌ Error during reminder check: ${(err as Error).message}`);
      }
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error(`❌ Unhandled Rejection at: ${promise}, reason: ${String(reason)}`);
      void shutdown();
    });

    process.on("uncaughtException", (error) => {
      logger.error(`❌ Uncaught Exception: ${error.message}`);
      void shutdown();
    });

    const PORT = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running in ${process.env.NODE_ENV || "development"} on port ${PORT}`);
    });

    setupSwagger(app);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`❌ Fatal server startup error: ${message}`);
    process.exit(1);
  }
})();
