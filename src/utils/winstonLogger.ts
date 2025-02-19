import type { Logger } from "winston";
import { createLogger, format, transports } from "winston";
import * as path from "path";
import * as fs from "fs";
import "winston-daily-rotate-file";

// Define log directory and level
const logDir = process.env.LOG_DIR || "logs";
const logLevel = process.env.LOG_LEVEL || "info";

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log format
const customLogFormat = format.printf(({ timestamp, level, message, stack }) => {
  return stack
    ? `${timestamp} [${level}]: ${message} - ${stack}` // Log stack trace if present
    : `${timestamp} [${level}]: ${message}`;
});

// Create the logger instance
const logger: Logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Standardized timestamp
    format.errors({ stack: true }), // Capture stack trace
    customLogFormat,
  ),
  transports: [
    // Daily rotating error logs
    new transports.DailyRotateFile({
      filename: path.join(logDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: process.env.LOG_MAX_SIZE || "5m",
      maxFiles: process.env.LOG_MAX_FILES_ERROR || "14d",
      zippedArchive: true,
    }),
    // Daily rotating combined logs
    new transports.DailyRotateFile({
      filename: path.join(logDir, "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: process.env.LOG_MAX_SIZE || "5m",
      maxFiles: process.env.LOG_MAX_FILES_COMBINED || "30d",
      zippedArchive: true,
    }),
  ],
});

// Add custom `logStructured` method
logger.logStructured = (infoObject: object): Logger => {
  logger.info(infoObject); // Log the structured object
  return logger;
};


// Add console transport for development environments
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.simple(),
      ),
    }),
  );
}

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
  new transports.File({ filename: path.join(logDir, "exceptions.log") }),
);

logger.rejections.handle(
  new transports.File({ filename: path.join(logDir, "rejections.log") }),
);

// Handle logger errors
logger.on("error", (err) => {
   
  console.error("Logger error:", err);
});

// Flush logs before exiting
process.on("exit", () => {
  logger.end();
});

export default logger;
