import type { Request, Response, Express } from "express";
import express from "express";
import dotenv from "dotenv";
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
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import newsletterRoutes from "./routes/newsletter";
import paymentRoutes from "./routes/payment";
import { errorHandler } from "./middleware/errorHandler";
import logger from "./utils/winstonLogger";

// Load environment variables
dotenv.config();

// Initialize the app
const app: Express = express();

// Middleware for raw body parsing (Stripe webhooks)
app.post(
  "/api/payments/webhook",
  bodyParser.raw({ type: "application/json" }),
  (req, _res, next) => {
    (req as any).rawBody = req.body; // Explicitly add rawBody for Stripe
    next();
  },
);

// Middleware to parse JSON requests
app.use(express.json({ limit: "10kb" })); // Limit body size
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable CSP for flexibility
  }),
);
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*", // Allow multiple origins
    credentials: true, // Allow credentials
  }),
);
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xssClean()); // Prevent XSS attacks
app.use(hpp()); // Prevent HTTP parameter pollution

// Logging Middleware (Morgan + Winston)
app.use(
  morgan("dev", {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }),
);

// Compression Middleware
app.use(compression());

mongoose
  .connect(process.env.MONGO_URI || "")
  .then(() => logger.info("MongoDB connected successfully"))
  .catch((err) => {
    logger.error(`MongoDB connection error: ${err}`);
    process.exit(1); // Exit process on DB connection failure
  });

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/payments", paymentRoutes);

// Health Check Endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "Healthy" });
});

// Handle 404 errors
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

// Error Handling Middleware
app.use(errorHandler);

// Handle Unhandled Promise Rejections & Uncaught Exceptions
process.on("unhandledRejection", (reason: any, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

process.on("uncaughtException", (error: Error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});

export default app;
