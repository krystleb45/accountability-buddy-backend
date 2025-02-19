import type { Request, Response, NextFunction } from "express-serve-static-core";
import logger from "../utils/winstonLogger";

/**
 * Debug Middleware
 * Logs detailed information about incoming requests, outgoing responses, and execution time.
 */
const debugMiddleware = (enabled: boolean = process.env.DEBUG_MODE === "true") => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!enabled) {
      return next();
    }

    const startTime = process.hrtime(); // Start timer
    logger.debug(`Incoming Request: ${req.method} ${req.url}`);

    res.on("finish", () => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = (seconds * 1000 + nanoseconds / 1e6).toFixed(2); // Convert to milliseconds
      logger.debug(`Response: ${res.statusCode} ${res.statusMessage} - ${duration}ms`);
    });

    try {
      next(); // Pass to the next middleware
    } catch (error) {
      logger.error(`Error processing request: ${(error as Error).message}`);
      throw error; // Re-throw after logging
    }
  };
};

export default debugMiddleware;
