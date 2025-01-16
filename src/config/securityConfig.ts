import helmet from "helmet";
import rateLimit from "express-rate-limit";
import xssClean from "xss-clean";
import cors from "cors"; // Fixed import for cors
import * as express from "express";
import type { Application, Request, Response, NextFunction } from "express";
import logger from "../utils/winstonLogger";


// Parse Allowed Origins
const parseAllowedOrigins = (): string[] => {
  const origins = process.env.ALLOWED_ORIGINS || "http://localhost:3000";
  return origins.split(",").map((origin) => origin.trim());
};

// CORS Configuration
const configureCORS = (): cors.CorsOptions => {
  const allowedOrigins = parseAllowedOrigins();

  logger.info(`Allowed Origins: ${allowedOrigins.join(", ")}`);

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ): void => {
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

// Rate Limiting Configuration
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const configureRateLimiter = () => {
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX || "100", 10);
  logger.info(`Rate Limit Max: ${maxRequests}`);

  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: maxRequests,
    message: "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Apply Security Middleware
// Apply Security Middleware
export const applySecurityMiddlewares = (app: Application): void => {
  // Apply security headers
  app.use(helmet());

  // Configure and apply CORS middleware
  app.use(cors(configureCORS()));

  // Apply rate limiting
  app.use(configureRateLimiter());

  // Apply XSS protection
  app.use(xssClean());

  // Body parser limits to avoid payload attacks
  const payloadLimit = process.env.PAYLOAD_LIMIT || "10kb";
  app.use(express.json({ limit: payloadLimit }));

  // Error handling for security middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(`Security middleware error: ${err.message}`);
    res.status(500).json({
      success: false,
      error: "Internal Server Error - Security Issue",
      details: err.message,
    });
  });

  logger.info("Security middlewares applied.");
};
