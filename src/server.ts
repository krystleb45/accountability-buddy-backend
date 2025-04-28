// src/server.ts
import dotenvFlow from "dotenv-flow";
dotenvFlow.config();
import { validateEnv } from "./utils/validateEnv";
validateEnv();

import { loadSecretsFromAWS } from "./utils/loadSecrets";
import express, { Application } from "express";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";

import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import xssClean from "xss-clean";
import hpp from "hpp";
import morgan from "morgan";
import bodyParser from "body-parser";

import { stripeRawBodyParser } from "./api/middleware/stripeWebhookParser";
import { authenticateJwt } from "./api/middleware/authJwt";
import notFoundMiddleware from "./api/middleware/notFoundMiddleware";
import { errorHandler } from "./api/middleware/errorHandler";

import setupSwagger from "./config/swaggerConfig";
import { applySecurityMiddlewares } from "./config/securityConfig";
import { logger } from "./utils/winstonLogger";

// ——— Routes —————————————————————————————
import authRoutes from "./api/routes/auth";
import userRoutes from "./api/routes/user";
import supportRoutes from "./api/routes/support";
import reminderRoutes from "./api/routes/reminder";
import messageRoutes from "./api/routes/messages";
import matchRoutes from "./api/routes/matches";
import auditRoutes from "./api/routes/audit";
import emailRoutes from "./api/routes/email";
import groupRoutes from "./api/routes/groupRoute";
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
import adminReports from "./api/routes/adminReports";
import recommendationRoutes from "./api/routes/recommendationRoutes";
import achievementRoutes from "./api/routes/achievement";
import activityRoutes from "./api/routes/activity";
import badgeRoutes from "./api/routes/badgeRoutes";
import challengeRoutes from "./api/routes/challenge";
import feedRoutes from "./api/routes/feed";
import progressRoutes from "./api/routes/progress";
import searchRoutes from "./api/routes/search";

async function startServer(): Promise<void> {
  try {
    await loadSecretsFromAWS();
    await mongoose.connect(process.env.MONGO_URI!);

    const app: Application = express();
    const httpServer = createServer(app);

    // Socket.IO
    global.io = new Server(httpServer, {
      cors: { origin: process.env.ALLOWED_ORIGINS?.split(",") },
    });

    // Security & sanitization
    app.use(helmet());
    applySecurityMiddlewares(app);
    app.use(mongoSanitize());
    app.use(xssClean());
    app.use(hpp());
    app.use(
      rateLimit({
        windowMs: 15 * 60e3,
        max: 100,
      })
    );
    app.use(
      cors({
        origin: process.env.ALLOWED_ORIGINS?.split(","),
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      })
    );

    // Stripe webhook (raw body)
    app.post("/webhooks/stripe", stripeRawBodyParser /* handler */);

    // Body parsers & compression
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(compression());

    // Request logging
    app.use(
      morgan("dev", {
        stream: {
          write: (msg) => logger.info(msg.trim()),
        },
      })
    );

    // Public routes
    app.use("/api/auth", authRoutes);

    // Protected routes
    app.use("/api", authenticateJwt);
    app.use("/api/users", userRoutes);
    app.use("/api/support", supportRoutes);
    app.use("/api/reminders", reminderRoutes);
    app.use("/api/messages", messageRoutes);
    app.use("/api/matches", matchRoutes);
    app.use("/api/audit", auditRoutes);
    app.use("/api/email", emailRoutes);
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
    app.use("/api/admin/reports", adminReports);
    app.use("/api/recommendations", recommendationRoutes);
    app.use("/api/achievements", achievementRoutes);
    app.use("/api/activities", activityRoutes);
    app.use("/api/badges", badgeRoutes);
    app.use("/api/challenges", challengeRoutes);
    app.use("/api/feed", feedRoutes);
    app.use("/api/progress", progressRoutes);
    app.use("/api/search", searchRoutes);

    // 404 handler
    app.use(notFoundMiddleware);

    // Main error handler (must come last)
    app.use(errorHandler);

    // Swagger UI
    setupSwagger(app);

    const PORT = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Fatal startup error:", err);
    process.exit(1);
  }
}

void startServer();
