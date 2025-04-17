import helmet from "helmet";
import rateLimit from "express-rate-limit";
import xssClean from "xss-clean";
import cors from "cors";
import * as express from "express";
import type { Application, Request, Response, NextFunction} from "express";
import { logger } from "../utils/winstonLogger";
import type { CorsOptions } from "cors";

const parseAllowedOrigins = (): string[] => {
  const origins = process.env.ALLOWED_ORIGINS || "http://localhost:3000";
  return origins.split(",").map((origin) => origin.trim());
};

// ✅ Dynamic CORS logic
const configureCORS = (): CorsOptions => {
  const allowedOrigins = parseAllowedOrigins();

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  };
};

export const applySecurityMiddlewares = (app: Application): void => {
  // ✅ Helmet with optional CSP for production
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production"
        ? {
          useDefaults: true,
          directives: {
            "script-src": ["'self'", "https://cdn.jsdelivr.net"],
            "img-src": ["'self'", "data:"],
            "connect-src": ["'self'", "https://api.stripe.com"],
          },
        }
        : false, // Disable CSP in dev to avoid local issues
    })
  );

  app.use(cors(configureCORS()));

  // ✅ Rate limiter
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
      message: "Too many requests, please try again later.",
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // ✅ Protect against XSS
  app.use(xssClean());

  // ✅ Custom payload limit (prevents body overflow attacks)
  app.use(express.json({ limit: process.env.PAYLOAD_LIMIT || "20kb" }));

  // ✅ Centralized error handler for middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(`Security middleware error: ${err.message}`);
    res.status(500).json({
      success: false,
      error: "Internal Server Error - Security Issue",
      details: err.message,
    });
  });

  logger.info("✅ Security middlewares applied.");
};
