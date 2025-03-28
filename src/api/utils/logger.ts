import type { Logger } from "winston";
import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file"; // Explicitly import

const { combine, timestamp, printf, colorize, errors } = format;

// Custom log format for console and file logs
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`; // Include stack trace if present
});

// Define transports for console and rotating file logs
const transportList: Array<
  transports.ConsoleTransportInstance | DailyRotateFile
> = [
  // Console transport
  new transports.Console({
    format: combine(
      colorize(), // Colorize output for better readability in console
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Format timestamp
      logFormat,
    ),
  }),

  // Daily rotating file for error logs
  new DailyRotateFile({
    filename: "logs/error-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    level: "error",
    maxFiles: "14d", // Keep logs for 14 days
    zippedArchive: true,
    format: combine(
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Format timestamp
      errors({ stack: true }), // Include error stack traces
      logFormat,
    ),
  }),

  // Daily rotating file for all logs
  new DailyRotateFile({
    filename: "logs/app-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    maxFiles: "30d", // Keep logs for 30 days
    zippedArchive: true,
    format: combine(
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Format timestamp
      logFormat,
    ),
  }),
];

// Create logger instance
const logger: Logger = createLogger({
  level: process.env.LOG_LEVEL || "info", // Default to 'info', can be set by environment variables
  format: combine(
    errors({ stack: true }), // Capture stack traces for error logs
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Format timestamp for consistency
  ),
  transports: transportList,
  exitOnError: false, // Prevent process exit on handled exceptions
});

// Adjust console logging for production
if (process.env.NODE_ENV === "production") {
  // Remove default console transport to avoid double logging
  logger.clear().add(
    new transports.Console({
      level: "error", // Log only errors in production
      format: combine(
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // Format timestamp
        logFormat,
      ),
    }),
  );
}

// Export the logger instance
export default logger;
