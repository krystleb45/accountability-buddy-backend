// src/app.ts
import dotenvFlow from "dotenv-flow";
dotenvFlow.config();

import { validateEnv } from "./utils/validateEnv";
validateEnv();

import express, { Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import xssClean from "xss-clean";
import hpp from "hpp";
import morgan from "morgan";
import bodyParser from "body-parser";

// ⚠️ Corrected import: JWT guard comes from authJwt.ts
import { authenticateJwt } from "./api/middleware/authJwt";

// Route imports
import authRoutes from "./api/routes/auth";
import userRoutes from "./api/routes/user";
import newsletterRoutes from "./api/routes/newsletter";
import paymentRoutes from "./api/routes/payment";
import challengeRoutes from "./api/routes/challenge";
import collaborationRoutes from "./api/routes/collaborationGoals";

// Swagger & error handling
import setupSwagger from "./config/swaggerConfig";
import { errorHandler } from "./api/middleware/errorHandler";
import { logger } from "./utils/winstonLogger";

const app = express();

// Stripe webhook raw-body parser
app.post(
  "/api/payments/webhook",
  bodyParser.raw({
    type: "application/json",
    limit: process.env.PAYLOAD_LIMIT || "20kb",
  }),
  (req, _res, next) => {
    (req as any).rawBody = req.body;
    next();
  }
);

// Core middleware
app.use(
  bodyParser.json({
    limit: process.env.PAYLOAD_LIMIT || "20kb",
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(compression());
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
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(
  morgan("dev", {
    stream: { write: (msg) => logger.info(msg.trim()) },
  })
);

// Public routes
app.use("/api/auth", authRoutes);

// JWT guard for everything under /api (except /api/auth)
app.use("/api", authenticateJwt);

// Protected routes
app.use("/api/users", userRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/challenge", challengeRoutes);
app.use("/api/collaboration", collaborationRoutes);

// Health check & 404
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "Healthy" });
});
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler & Swagger
app.use(errorHandler);
setupSwagger(app);

// Connect to Mongo and start listening
mongoose
  .connect(process.env.MONGO_URI || "")
  .then(() => {
    logger.info("✅ MongoDB connected");
    const PORT = parseInt(process.env.PORT || "5000", 10);
    app.listen(PORT, () => {
      logger.info(
        `🚀 Test server running in ${
          process.env.NODE_ENV || "development"
        } on port ${PORT}`
      );
    });
  })
  .catch((err) => {
    logger.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

export default app;
