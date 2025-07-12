// src/server.ts - EMERGENCY: Block all Redis before anything else

// ═══════════════════════════════════════════════════════════════
// 🚫 EMERGENCY REDIS BLOCKER - MUST BE FIRST
// ═══════════════════════════════════════════════════════════════

console.log("🚨 EMERGENCY: Activating Redis connection blocker");

// Set all disable flags
process.env.DISABLE_REDIS = "true";
process.env.SKIP_REDIS_INIT = "true";
process.env.REDIS_DISABLED = "true";

// Clear all Redis environment variables
delete process.env.REDIS_URL;
delete process.env.REDIS_PRIVATE_URL;
delete process.env.REDIS_PUBLIC_URL;
delete process.env.REDIS_HOST;
delete process.env.REDIS_PORT;
delete process.env.REDIS_PASSWORD;
delete process.env.REDIS_USERNAME;

// Override module loading to block Redis
const Module = require("module");
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id: string) {
  // Block any Redis-related modules
  if (id === "ioredis" ||
      id === "redis" ||
      id.includes("redis") ||
      id === "bull" ||
      id === "bullmq" ||
      id.includes("bull")) {

    console.log(`🚫 BLOCKED Redis module: ${id}`);

    // Return mock Redis object
    return {
      createClient: () => ({
        on: () => {},
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
        quit: () => Promise.resolve(),
        get: () => Promise.resolve(null),
        set: () => Promise.resolve("OK"),
        del: () => Promise.resolve(1)
      }),
      default: class MockRedis {
        constructor() {
          console.log("🚫 Redis connection attempt blocked");
        }
        on() { return this; }
        connect() { return Promise.resolve(); }
        disconnect() { return Promise.resolve(); }
        quit() { return Promise.resolve(); }
        get() { return Promise.resolve(null); }
        set() { return Promise.resolve("OK"); }
        del() { return Promise.resolve(1); }
      },
      Redis: class MockRedis {
        constructor() {
          console.log("🚫 ioredis Redis connection blocked");
        }
        on() { return this; }
        connect() { return Promise.resolve(); }
        disconnect() { return Promise.resolve(); }
        quit() { return Promise.resolve(); }
        get() { return Promise.resolve(null); }
        set() { return Promise.resolve("OK"); }
        del() { return Promise.resolve(1); }
      },
      Queue: class MockQueue {
        constructor() {
          console.log("🚫 Bull Queue blocked");
        }
        add() { return Promise.resolve({ id: "mock" }); }
        process() { return this; }
        on() { return this; }
      }
    };
  }

  return originalRequire.apply(this, arguments);
};

console.log("✅ Redis blocker activated - all Redis connections will be blocked");

// ═══════════════════════════════════════════════════════════════
// NOW CONTINUE WITH YOUR EXISTING SERVER CODE
// ═══════════════════════════════════════════════════════════════

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
    console.log("🚀 Starting server with Redis disabled...");

    // 1) Only load AWS secrets in production, skip for staging
    if (process.env.NODE_ENV === "production" && process.env.AWS_REGION) {
      await loadSecretsFromAWS();
      logger.info("✅ AWS secrets loaded");
    } else {
      logger.info("ℹ️ Skipping AWS secrets for staging environment");
    }

    // 2) Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI!);
    logger.info("✅ MongoDB connected");

    // 3) Create HTTP server and setup Socket.IO with all features
    const httpServer = createServer(app);

    // 🆕 FIXED: Get both io and socketService from socketServer
    const { io, socketService } = socketServer(httpServer);
    global.io = io;

    // 🆕 REGISTER the socket service with Express app so controllers can access it
    app.set("anonymousMilitarySocketService", socketService);
    logger.info("✅ Anonymous military socket service registered");

    // 4) Start listening
    const PORT = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server listening on port ${PORT}`);
      console.log(`🌐 Server URL: http://0.0.0.0:${PORT}`);
      console.log("🚫 Redis status: DISABLED");
      logger.info(`🚀 Server listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error("❌ Fatal startup error:", err);
    console.error("❌ Fatal startup error:", err);
    process.exit(1);
  }
}

// ─── Launch ─────────────────────────────────────────────────────
console.log("🎯 Launching server...");
void startServer();
