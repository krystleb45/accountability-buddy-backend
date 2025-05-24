import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

// Define log directory from environment or use default
const logDir = process.env.LOG_DIR || "logs";

// Create a custom logger with enhanced configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info", // Set log level from environment, default to 'info'
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }), // Include error stack trace
    winston.format.json(),
  ),
  transports: [
    // Rotating file transport for error logs
    new DailyRotateFile({
      filename: `${logDir}/error-%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxFiles: "14d",       // Retain error logs for 14 days
      zippedArchive: true,   // Compress old log files
    }),
    // Rotating file transport for combined logs
    new DailyRotateFile({
      filename: `${logDir}/combined-%DATE%.log`,
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",       // Retain combined logs for 30 days
      zippedArchive: true,
    }),
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// Add console logging in non-production environments
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Colorize console output
        winston.format.simple(),
      ),
    })
  );
}

// Handle uncaught exceptions
logger.exceptions.handle(
  new DailyRotateFile({
    filename: `${logDir}/exceptions-%DATE%.log`,
    datePattern: "YYYY-MM-DD",
    maxFiles: "7d",  // Retain exception logs for 7 days
    zippedArchive: true,
  })
);

// Also catch any uncaught exceptions at the process level
process.on("uncaughtException", (err) => {
  logger.error("❌ Uncaught Exception:", err);
  // note: not exiting so that Winston's exceptions.handle can rotate & write
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  logger.error("❌ Unhandled Rejection:", reason);
});

// Catch Node.js warnings (including deprecation notices)
process.on("warning", (warning) => {
  logger.warn(`⚠️ Warning: ${warning.name} – ${warning.message}`, {
    stack: warning.stack,
  });
});

export default logger;
