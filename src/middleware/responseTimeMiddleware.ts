import type { Request, Response, NextFunction } from "express-serve-static-core";
import logger from "../utils/winstonLogger";

/**
 * Middleware to measure and log the response time for requests.
 * Adds an `X-Response-Time` header to the response and logs the duration.
 */
const responseTimeMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Capture the start time
  const start = process.hrtime();

  // Set up a listener for the 'finish' event to calculate and log response time
  res.on("finish", () => {
    const [seconds, nanoseconds] = process.hrtime(start); // Get the elapsed time
    const durationInMilliseconds = (seconds * 1e3 + nanoseconds / 1e6).toFixed(3); // Convert to milliseconds

    // Add the response time to the headers
    res.setHeader("X-Response-Time", `${durationInMilliseconds}ms`);

    // Log the request and response details with the response time
    logger.info({
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${durationInMilliseconds}ms`,
      userAgent: req.headers["user-agent"] || "Unknown", // Include User-Agent for additional debugging
      ip: req.ip, // Log the IP address of the requester
    });
  });

  next(); // Proceed to the next middleware or route handler
};

export default responseTimeMiddleware;
