import { logger } from "../../utils/winstonLogger";

interface Metadata {
  [key: string]: unknown;
}

const environment = process.env.NODE_ENV || "development";
const allowDebug = environment === "development" || process.env.ENABLE_DEBUG === "true";
const enableRemote = process.env.ENABLE_REMOTE_LOGGING === "true";

/**
 * Redact sensitive fields like tokens, passwords, etc.
 */
const sensitiveFields = ["token", "password", "authorization", "email"];
function sanitizeMetadata(metadata: Metadata): Metadata {
  const { _message, _timestamp, _level, ...rest } = metadata;
  const sanitized: Metadata = {};

  for (const [key, value] of Object.entries(rest)) {
    sanitized[key] = sensitiveFields.includes(key.toLowerCase()) ? "[REDACTED]" : value;
  }

  return sanitized;
}

/**
 * Stub for sending logs to a remote service (e.g., Sentry, LogRocket)
 */
async function sendToRemoteService(_level: string, _payload: any): Promise<void> {
  if (!enableRemote) return;

  try {
    // Replace with actual implementation:
    // await Sentry.captureMessage(JSON.stringify(_payload));
    // await LogRocket.log(_level, _payload);
    // console.log(`[REMOTE LOG - ${_level.toUpperCase()}]:`, _payload);
  } catch (err) {
    logger.warn({
      message: "Remote log forwarding failed",
      error: (err as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
}

const LoggingService = {
  /**
   * 📘 Info logs – general operations
   */
  logInfo: async (message: string, metadata: Metadata = {}): Promise<void> => {
    const payload = {
      message,
      ...sanitizeMetadata(metadata),
      timestamp: new Date().toISOString(),
      environment,
    };
    logger.info(payload);
    await sendToRemoteService("info", payload);
  },

  /**
   * ⚠️ Warnings – non-fatal issues
   */
  logWarn: async (message: string, metadata: Metadata = {}): Promise<void> => {
    const payload = {
      message,
      ...sanitizeMetadata(metadata),
      timestamp: new Date().toISOString(),
      environment,
    };
    logger.warn(payload);
    await sendToRemoteService("warn", payload);
  },

  /**
   * ❌ Errors – operational failures
   */
  logError: async (message: string, err: Error | string, metadata: Metadata = {}): Promise<void> => {
    const details =
      typeof err === "string"
        ? { error: err }
        : { error: err.message, stack: err.stack || "No stack trace" };

    const payload = {
      message,
      ...details,
      ...sanitizeMetadata(metadata),
      timestamp: new Date().toISOString(),
      environment,
    };

    logger.error(payload);
    await sendToRemoteService("error", payload);
  },

  /**
   * 🐞 Debug logs – only in development
   */
  logDebug: async (message: string, metadata: Metadata = {}): Promise<void> => {
    if (!allowDebug) return;

    const payload = {
      message,
      ...sanitizeMetadata(metadata),
      timestamp: new Date().toISOString(),
      environment,
    };

    logger.debug(payload);
    await sendToRemoteService("debug", payload);
  },

  /**
   * 🛑 Fatal logs – critical errors
   */
  logFatal: async (message: string, err: Error | string, metadata: Metadata = {}): Promise<void> => {
    const details =
      typeof err === "string"
        ? { error: err }
        : { error: err.message, stack: err.stack || "No stack trace" };

    const payload = {
      message: `FATAL: ${message}`,
      ...details,
      ...sanitizeMetadata(metadata),
      timestamp: new Date().toISOString(),
      environment,
    };

    logger.error(payload);
    await sendToRemoteService("fatal", payload);
  },

  /**
   * 🧠 Context logs – app breadcrumbs or trace info
   */
  logContext: async (message: string, context: Metadata = {}): Promise<void> => {
    const payload = {
      message,
      ...sanitizeMetadata(context),
      timestamp: new Date().toISOString(),
      environment,
    };

    logger.info(payload);
    await sendToRemoteService("info", payload);
  },

  /**
   * 🚀 Performance metrics (latency, memory, etc.)
   */
  logPerformance: async (
    message: string,
    metrics: Record<string, unknown>,
    metadata: Metadata = {}
  ): Promise<void> => {
    const payload = {
      message,
      metrics,
      ...sanitizeMetadata(metadata),
      timestamp: new Date().toISOString(),
      environment,
    };

    logger.info(payload);
    await sendToRemoteService("performance", payload);
  },
};

export default LoggingService;
