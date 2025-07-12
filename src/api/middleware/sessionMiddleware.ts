// src/api/middleware/sessionMiddleware.ts - COMPLETELY REWRITTEN: No top-level Redis imports
import type { SessionOptions } from "express-session";
import session from "express-session";
import type { Request, Response, NextFunction } from "express";
import { logger } from "../../utils/winstonLogger";

// Check if Redis is disabled BEFORE any Redis imports
const isRedisDisabled = process.env.DISABLE_REDIS === "true" ||
                       process.env.SKIP_REDIS_INIT === "true" ||
                       process.env.REDIS_DISABLED === "true";

let sessionMiddleware: any;

if (isRedisDisabled) {
  logger.info("🚫 Redis disabled - using memory store for sessions");
  console.log("🚫 Sessions: Using memory store (Redis disabled)");

  // Use memory store only - no Redis imports needed
  sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || "emergency-fallback-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax"
    },
    // No store specified = uses default MemoryStore
    name: "accountability-buddy-session"
  } as SessionOptions);

  logger.info("✅ Session middleware initialized with memory store");

} else {
  logger.info("🔴 Redis enabled - attempting to use Redis store for sessions");
  console.log("🔴 Sessions: Attempting Redis store setup");

  try {
    // Dynamic imports only when Redis is enabled
    const connectRedis = require("connect-redis");
    const { createClient } = require("redis");

    // Create Redis client
    const redisClient = createClient({
      url: process.env.REDIS_URL ||
           `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || "6379"}`,
      password: process.env.REDIS_PASSWORD,
    });

    // Redis client error handling
    redisClient.on("error", (err: Error) => {
      logger.error(`Redis session client error: ${err.message}`);
      console.error("Redis session store error:", err.message);
    });

    redisClient.on("connect", () => {
      logger.info("Session Redis client connected");
      console.log("✅ Session Redis client connected");
    });

    // Connect to Redis (but don't exit on failure)
    void (async () => {
      try {
        await redisClient.connect();
        logger.info("Session Redis client ready");
      } catch (error) {
        logger.error(`Failed to connect session Redis: ${(error as Error).message}`);
        console.error("Session Redis connection failed - continuing with memory store");
        // Don't exit process, just log the error
      }
    })();

    // Initialize Redis store for sessions
    const RedisStore = connectRedis(session);

    const sessionStore = new RedisStore({
      client: redisClient as any,
      prefix: "accountability-buddy:sess:",
      ttl: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    sessionMiddleware = session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "fallback-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: "lax"
      },
      name: "accountability-buddy-session"
    } as SessionOptions);

    logger.info("✅ Session middleware initialized with Redis store");

  } catch (error) {
    logger.error(`Failed to setup Redis sessions: ${(error as Error).message}`);
    logger.warn("⚠️ Falling back to memory store for sessions");
    console.log("⚠️ Redis session setup failed, using memory store");

    // Fallback to memory store if Redis setup fails
    sessionMiddleware = session({
      secret: process.env.SESSION_SECRET || "fallback-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: "lax"
      },
      name: "accountability-buddy-session"
    } as SessionOptions);

    logger.info("✅ Session middleware initialized with fallback memory store");
  }
}

// Enhanced middleware wrapper to handle session errors gracefully
const enhancedSessionMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  void sessionMiddleware(req, res, (err?: any) => {
    if (err instanceof Error) {
      logger.error(`Session middleware error: ${err.message}`);
      res.status(500).json({ message: "Session handling error" });
    } else if (err) {
      logger.error("Session middleware encountered an unknown error");
      res.status(500).json({ message: "Unknown session handling error" });
    } else {
      // Log session details if available (only in development)
      if (req.session && process.env.NODE_ENV !== "production") {
        logger.debug(`Session ID: ${req.sessionID}`);
        logger.debug(`Session Data: ${JSON.stringify(req.session)}`);
      }
      next();
    }
  });
};

export default enhancedSessionMiddleware;
