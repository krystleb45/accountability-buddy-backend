// src/server.ts

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
dotenvFlow.config();

import { validateEnv } from "./utils/validateEnv";
validateEnv();

import { loadSecretsFromAWS } from "./utils/loadSecrets";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import { logger } from "./utils/winstonLogger";

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

    // 2) Create HTTP server and attach Socket.io
    const httpServer = createServer(app);
    global.io = new Server(httpServer, {
      cors: { origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" },
    });

    // 3) Handle Socket.io connections
    global.io.on("connection", (socket) => {
      const userId = socket.handshake.auth.userId as string;
      if (userId) {
        void socket.join(userId);  // explicitly ignore the returned Promise
        logger.info(`🔌 Socket ${socket.id} joined room ${userId}`);
      }
    });

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
