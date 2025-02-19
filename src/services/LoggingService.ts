import logger from "../utils/winstonLogger";

interface Metadata {
  [key: string]: unknown;
}

const LoggingService = {
  /**
   * Log informational messages
   * @param {string} message - The message to log
   * @param {Metadata} [metadata={}] - Optional metadata for contextual logging
   */
  logInfo: (message: string, metadata: Metadata = {}): void => {
    logger.info({
      message,
      ...sanitizeMetadata(metadata),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  },

  /**
   * Log warning messages
   * @param {string} message - The message to log
   * @param {Metadata} [metadata={}] - Optional metadata for contextual logging
   */
  logWarn: (message: string, metadata: Metadata = {}): void => {
    logger.warn({
      message,
      ...sanitizeMetadata(metadata),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  },

  /**
   * Log error messages
   * @param {string} message - The message to log
   * @param {Error | string} err - The error object or string
   * @param {Metadata} [metadata={}] - Optional metadata for contextual logging
   */
  logError: (
    message: string,
    err: Error | string,
    metadata: Metadata = {},
  ): void => {
    const errorDetails =
      typeof err === "string"
        ? { error: err }
        : { error: err.message, stack: err.stack || "No stack trace" };

    logger.error({
      message,
      ...errorDetails,
      ...sanitizeMetadata(metadata),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  },

  /**
   * Log debugging information (only in development mode)
   * @param {string} message - The message to log
   * @param {Metadata} [metadata={}] - Optional metadata for contextual logging
   */
  logDebug: (message: string, metadata: Metadata = {}): void => {
    if (process.env.NODE_ENV === "development") {
      logger.debug({
        message,
        ...sanitizeMetadata(metadata),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
      });
    }
  },

  /**
   * Log fatal errors (critical failures that may require immediate action)
   * @param {string} message - The message to log
   * @param {Error | string} err - The error object or string
   * @param {Metadata} [metadata={}] - Optional metadata for contextual logging
   */
  logFatal: (
    message: string,
    err: Error | string,
    metadata: Metadata = {},
  ): void => {
    const errorDetails =
      typeof err === "string"
        ? { error: err }
        : { error: err.message, stack: err.stack || "No stack trace" };

    logger.error({
      message: `FATAL: ${message}`,
      ...errorDetails,
      ...sanitizeMetadata(metadata),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });

    // Optional: Trigger alerts or notifications for fatal errors
  },

  /**
   * Log performance metrics (e.g., response time, memory usage)
   * @param {string} message - The message to log
   * @param {object} metrics - Performance metrics to log
   * @param {Metadata} [metadata={}] - Optional metadata for contextual logging
   */
  logPerformance: (
    message: string,
    metrics: Record<string, unknown>,
    metadata: Metadata = {},
  ): void => {
    logger.info({
      message,
      metrics,
      ...sanitizeMetadata(metadata),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  },

  /**
   * Log contextual information for troubleshooting
   * @param {string} message - The message to log
   * @param {Metadata} context - Contextual information to include
   */
  logContext: (message: string, context: Metadata): void => {
    logger.info({
      message,
      ...sanitizeMetadata(context),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  },
};

/**
 * Helper function to sanitize metadata by removing duplicate or conflicting keys.
 * @param metadata - The metadata object to sanitize
 * @returns Sanitized metadata
 */
function sanitizeMetadata(metadata: Metadata): Metadata {
  const { message, timestamp, ...rest } = metadata;
  // Explicitly ignore `message` and `timestamp` to avoid overwriting base keys
  void message;
  void timestamp;
  return rest;
}

export default LoggingService;
