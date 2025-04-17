// src/app.ts

import type { Request, Response, Express } from "express";
import express from "express";
import dotenvFlow from "dotenv-flow";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import xssClean from "xss-clean";
import hpp from "hpp";
import bodyParser from "body-parser";

import authRoutes from "./api/routes/auth";
import userRoutes from "./api/routes/user";
import newsletterRoutes from "./api/routes/newsletter";
import paymentRoutes from "./api/routes/payment";
import challengeRoutes from "./api/routes/challenge";
import collaborationRoutes from "./api/routes/collaborationGoals";

import { errorHandler } from "./api/middleware/errorHandler";
import { logger } from "./utils/winstonLogger";
import setupSwagger from "./config/swaggerConfig";
import { validateEnv } from "./utils/validateEnv";

// ✅ Load environment variables using dotenv-flow
dotenvFlow.config();

// ✅ Validate required environment variables
validateEnv();

// ✅ Initialize Express
const app: Express = express();

// ✅ Stripe Webhook Raw Body Parser
app.post(
  "/api/payments/webhook",
  bodyParser.raw({ type: "application/json" }),
  (req, _res, next) => {
    (req as any).rawBody = req.body;
    next();
  }
);

// ✅ Middleware: JSON, URL-Encoded, Compression
app.use(express.json({ limit: process.env.PAYLOAD_LIMIT || "20kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// ✅ Security Middleware
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? {
          useDefaults: true,
          directives: {
            "script-src": ["'self'", "https://cdn.jsdelivr.net"],
            "img-src": ["'self'", "data:"],
            "connect-src": ["'self'", "https://api.stripe.com"],
          },
        }
        : false,
  })
);

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  })
);

app.use(mongoSanitize());
app.use(xssClean());
app.use(hpp());

// ✅ Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ✅ Winston Logging with Morgan
app.use(
  morgan("dev", {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// ✅ Serve Static Assets (if any)
app.use("/assets", express.static("public/assets"));

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/challenge", challengeRoutes);
app.use("/api/collaboration", collaborationRoutes);

// ✅ Health Check
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "Healthy" });
});

// ✅ Not Found Route Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// ✅ Error Handler Middleware
app.use(errorHandler);

// ✅ Swagger (Load last to avoid conflicting with routes)
setupSwagger(app);

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI || "")
  .then(() => logger.info("✅ MongoDB connected successfully"))
  .catch((err) => {
    logger.error(`❌ MongoDB connection error: ${err}`);
    process.exit(1);
  });

// ✅ Crash Recovery for Unhandled Promises and Exceptions
process.on("unhandledRejection", (reason: any, promise) => {
  logger.error(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

process.on("uncaughtException", (error: Error) => {
  logger.error(`❌ Uncaught Exception: ${error.message}`);
  process.exit(1);
});

// ✅ Start Server
const PORT = parseInt(process.env.PORT || "5000", 10);
app.listen(PORT, () => {
  logger.info(
    `🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
  );
});

export default app;
