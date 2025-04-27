// src/server.ts
import dotenvFlow from "dotenv-flow";
dotenvFlow.config(); // Load env vars based on NODE_ENV

import { validateEnv } from "./utils/validateEnv";
validateEnv(); // Exit if any required env var is missing

import { loadSecretsFromAWS } from "./utils/loadSecrets";
import type { Application } from "express";
import express from "express";
import mongoose from "mongoose";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import xssClean from "xss-clean";
import hpp from "hpp";
import morgan from "morgan";
import bodyParser from "body-parser";
import { createServer } from "http";
import { Server } from "socket.io";

declare global {
  var io: Server;
}

import { stripeRawBodyParser } from "./api/middleware/stripeWebhookParser";
import { authenticateJwt } from "./api/middleware/authJwt";
import { errorHandler } from "./api/middleware/errorHandler";
import setupSwagger from "./config/swaggerConfig";
import { applySecurityMiddlewares } from "./config/securityConfig";
import { logger } from "./utils/winstonLogger";

// Route imports
import authRoutes from "./api/routes/auth";
import userRoutes from "./api/routes/user";
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
import recommendationRoutes from "./api/routes/recommendationRoutes";
import achievementRoutes from "./api/routes/achievement";
import activityRoutes from "./api/routes/activity";
import badgeRoutes from "./api/routes/badgeRoutes";
import challengeRoutes from "./api/routes/challenge";
import feedRoutes from "./api/routes/feed";
import progressRoutes from "./api/routes/progress";
import searchRoutes from "./api/routes/search";
// **New** admin‐reports router:
import adminReports from "./api/routes/adminReports";

async function startServer(): Promise<void> {
  try {
    console.log("⏱️  startServer BEGIN");

    console.log("⏱️  before loadSecretsFromAWS");
    await loadSecretsFromAWS();
    console.log("✔️   after loadSecretsFromAWS");

    console.log("⏱️  before mongoose.connect");
    await mongoose.connect(process.env.MONGO_URI!);
    console.log("✔️   after mongoose.connect");

    console.log("⏱️  before express init");
    const app: Application = express();
    console.log("✔️   after express init");

    console.log("⏱️  before Socket.IO init");
    const httpServer = createServer(app);
    global.io = new Server(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
      },
    });
    console.log("✔️   after Socket.IO init");

    console.log("⏱️  before middleware");
    app.use(helmet());
    applySecurityMiddlewares(app);
    app.use(mongoSanitize());
    app.use(xssClean());
    app.use(hpp());
    app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
    app.use(
      cors({
        origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      })
    );
    app.use(stripeRawBodyParser);
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(compression());
    console.log("✔️   after middleware");

    console.log("⏱️  before request logging setup");
    app.use(
      morgan("dev", {
        stream: { write: (msg) => logger.info(msg.trim()) },
      })
    );
    console.log("✔️   after request logging setup");

    console.log("⏱️  before mounting public routes");
    app.use("/api/auth", authRoutes);
    console.log("✔️   after mounting public routes");

    console.log("⏱️  before JWT guard");
    app.use("/api", authenticateJwt);
    console.log("✔️   after JWT guard");

    console.log("⏱️  before mounting other API routes");
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
    // **New admin reports endpoint**
    app.use("/api/admin/reports", adminReports);
    app.use("/api/recommendations", recommendationRoutes);
    app.use("/api/achievements", achievementRoutes);
    app.use("/api/activities", activityRoutes);
    app.use("/api/badges", badgeRoutes);
    app.use("/api/challenges", challengeRoutes);
    app.use("/api/feed", feedRoutes);
    app.use("/api/progress", progressRoutes);
    app.use("/api/search", searchRoutes);
    console.log("✔️   after mounting other API routes");

    console.log("⏱️  before error handler & Swagger");
    app.use(errorHandler);
    setupSwagger(app);
    console.log("✔️   after error handler & Swagger");

    console.log("⏱️  before httpServer.listen");
    const PORT = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(PORT, () => {
      console.log(`🚀 LISTENING on port ${PORT}`);
      logger.info(`Server running on port ${PORT}`);
    });
    console.log("✔️   after httpServer.listen");
  } catch (err) {
    console.error("💥 Startup caught error:", err);
    logger.error("❌ Fatal server startup error:", err instanceof Error ? err : String(err));
    process.exit(1);
  }
}

startServer().catch((err) => {
  console.error("💥 startServer failed:", err);
  logger.error("❌ Server failed to start:", err);
  process.exit(1);
});
