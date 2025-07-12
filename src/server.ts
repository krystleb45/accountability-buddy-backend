// src/server.ts - EMERGENCY: Block all Redis before anything else

// ═══════════════════════════════════════════════════════════════
// 🚫 ENHANCED REDIS BLOCKER - PRODUCTION SAFE
// ═══════════════════════════════════════════════════════════════

console.log("🚨 PRODUCTION: Enhanced Redis connection blocker");

// Force ALL Redis disable flags
process.env.DISABLE_REDIS = "true";
process.env.SKIP_REDIS_INIT = "true";
process.env.REDIS_DISABLED = "true";
process.env.DISABLE_EMAIL_QUEUE = "true";

// Clear ALL Redis environment variables
delete process.env.REDIS_URL;
delete process.env.REDIS_PRIVATE_URL;
delete process.env.REDIS_PUBLIC_URL;
delete process.env.REDIS_HOST;
delete process.env.REDIS_PORT;
delete process.env.REDIS_PASSWORD;
delete process.env.REDIS_USERNAME;

// Enhanced module blocking
const Module = require("module");
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id: string): any {
  // Block any Redis-related modules
  if (id === "ioredis" ||
      id === "redis" ||
      id === "@redis/client" ||
      id.includes("redis") ||
      id === "bull" ||
      id === "bullmq" ||
      id.includes("bull") ||
      id === "connect-redis" ||
      id === "rate-limit-redis") {

    console.log(`🚫 PRODUCTION BLOCKED: ${id}`);

    // Return comprehensive mock Redis object
    return {
      createClient: (): any => ({
        on: (): void => {},
        connect: (): Promise<void> => Promise.resolve(),
        disconnect: (): Promise<void> => Promise.resolve(),
        quit: (): Promise<void> => Promise.resolve(),
        get: (): Promise<null> => Promise.resolve(null),
        set: (): Promise<string> => Promise.resolve("OK"),
        del: (): Promise<number> => Promise.resolve(1),
        sendCommand: (): Promise<string> => Promise.resolve(""),
        sAdd: (): Promise<number> => Promise.resolve(1),
        sRem: (): Promise<number> => Promise.resolve(1),
        sMembers: (): Promise<string[]> => Promise.resolve([]),
        incr: (): Promise<number> => Promise.resolve(1),
        expire: (): Promise<number> => Promise.resolve(1),
        keys: (): Promise<string[]> => Promise.resolve([]),
        flushDb: (): Promise<string> => Promise.resolve("OK"),
        setex: (): Promise<string> => Promise.resolve("OK"),
        ttl: (): Promise<number> => Promise.resolve(-1),
        exists: (): Promise<number> => Promise.resolve(0)
      }),
      default: class MockRedis {
        constructor() {
          console.log("🚫 Mock Redis connection created");
        }
        on(): this { return this; }
        connect(): Promise<void> { return Promise.resolve(); }
        disconnect(): Promise<void> { return Promise.resolve(); }
        quit(): Promise<void> { return Promise.resolve(); }
        get(): Promise<null> { return Promise.resolve(null); }
        set(): Promise<string> { return Promise.resolve("OK"); }
        del(): Promise<number> { return Promise.resolve(1); }
        sendCommand(): Promise<string> { return Promise.resolve(""); }
        setex(): Promise<string> { return Promise.resolve("OK"); }
        keys(): Promise<string[]> { return Promise.resolve([]); }
      },
      Redis: class MockIoRedis {
        constructor() {
          console.log("🚫 Mock ioredis connection created");
        }
        on(): this { return this; }
        connect(): Promise<void> { return Promise.resolve(); }
        disconnect(): Promise<void> { return Promise.resolve(); }
        quit(): Promise<void> { return Promise.resolve(); }
        get(): Promise<null> { return Promise.resolve(null); }
        set(): Promise<string> { return Promise.resolve("OK"); }
        del(): Promise<number> { return Promise.resolve(1); }
        setex(): Promise<string> { return Promise.resolve("OK"); }
        keys(): Promise<string[]> { return Promise.resolve([]); }
      },
      Queue: class MockQueue {
        constructor() {
          console.log("🚫 Mock Bull Queue created");
        }
        add(): Promise<{ id: string }> { return Promise.resolve({ id: "mock" }); }
        process(): this { return this; }
        on(): this { return this; }
        close(): Promise<void> { return Promise.resolve(); }
      }
    };
  }

  return originalRequire.apply(this, arguments);
};

console.log("✅ PRODUCTION: Enhanced Redis blocker activated - ALL Redis connections blocked");

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
