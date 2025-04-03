import * as Sentry from "@sentry/node";
import { logger } from "../../utils/winstonLogger"; // Assuming you have a logger utility

// Initialize Sentry
Sentry.init({ dsn: process.env.SENTRY_DSN || "your-sentry-dsn-here" });

/**
 * @desc Log an error to Sentry and your local logging system (e.g., Winston).
 * @param {Error} error - The error object to log.
 * @param {string} [message] - Optional custom message for logging.
 */
export const logError = (error: Error, message?: string): void => {
  // Log error to Sentry
  Sentry.captureException(error);

  // Log error to your local logger (Winston)
  logger.error(message || "An error occurred", {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });
};

/**
 * @desc Capture and log custom error messages to Sentry.
 * @param {string} message - Custom message to log.
 * @param {Record<string, any>} [extraData] - Optional extra data for custom context.
 */
export const captureError = (message: string, extraData?: Record<string, any>): void => {
  Sentry.captureMessage(message, {
    level: "error",
    extra: extraData || {},
  });

  // Log to your local logger (Winston)
  logger.error(message, extraData);
};
