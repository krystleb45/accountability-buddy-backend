import helmet from "helmet";
import rateLimit from "express-rate-limit";
import xssClean from "xss-clean";
import cors from "cors"; // Import cors
import * as express from "express";
import type { Application, Request, Response, NextFunction } from "express";
import logger from "../utils/winstonLogger";

const parseAllowedOrigins = (): string[] => {
  const origins = process.env.ALLOWED_ORIGINS || "http://localhost:3000";
  return origins.split(",").map((origin) => origin.trim());
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const configureCORS = () => {
  const allowedOrigins = parseAllowedOrigins();

  return {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
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
  app.use(helmet());
  app.use(cors(configureCORS())); // No explicit casting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
    message: "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  }));
  app.use(xssClean());
  app.use(express.json({ limit: process.env.PAYLOAD_LIMIT || "10kb" }));

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
