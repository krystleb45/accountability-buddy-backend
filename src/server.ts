// src/server.ts - FIXED: Register socket service with Express app

// ─── Crash Guards ───────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled rejection:", reason);
  process.exit(1);
});

// ─── Imports ─────────────────────────────────────────────────────
import mongoose from "mongoose";
import dotenvFlow from "dotenv-flow";

// Don't crash if .env files are missing (Railway uses environment variables directly)
try {
  dotenvFlow.config();
  console.log("✅ Environment configuration loaded");
} catch {
  console.log("ℹ️ No .env files found, using environment variables directly");
}

import { validateEnv } from "./utils/validateEnv";
validateEnv();

import { loadSecretsFromAWS } from "./utils/loadSecrets";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import { logger } from "./utils/winstonLogger";
import socketServer from "./sockets/index"; // This now returns { io, socketService }

// ─── Extend NodeJS global for Socket.io ────────────────────────
declare global {
  namespace NodeJS {
    interface Global {
      io: Server;
    }
  }
}

// ─── Server Startup ─────────────────────────────────────────────
async function startServer(): Promise<void> {
  try {
    // 1) Load any secrets and connect to MongoDB
    await loadSecretsFromAWS();
    await mongoose.connect(process.env.MONGO_URI!);
    logger.info("✅ MongoDB connected");

    // 2) Create HTTP server and setup Socket.IO with all features
    const httpServer = createServer(app);

    // 🆕 FIXED: Get both io and socketService from socketServer
    const { io, socketService } = socketServer(httpServer);
    global.io = io;

    // 🆕 REGISTER the socket service with Express app so controllers can access it
    app.set("anonymousMilitarySocketService", socketService);
    logger.info("✅ Anonymous military socket service registered");

    // 4) Start listening
    const PORT = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error("❌ Fatal startup error:", err);
    process.exit(1);
  }
}

// ─── Launch ─────────────────────────────────────────────────────
void startServer();
