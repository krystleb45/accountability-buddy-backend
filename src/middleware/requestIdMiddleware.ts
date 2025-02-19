import type { Request, Response, NextFunction } from "express-serve-static-core";
import { v4 as uuidv4 } from "uuid";
import logger from "../utils/winstonLogger";

// Extend the Express Request interface to include the custom property
declare module "express-serve-static-core" {
  interface Request {
    requestId?: string; // Declare requestId as an optional string
  }
}

/**
 * Middleware to generate a unique request ID and set it in request and response
 */
const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const requestId = uuidv4();
    req.requestId = requestId; // Set requestId in the request object
    res.setHeader("X-Request-ID", requestId); // Set requestId in the response headers

    logger.info(`[REQUEST-ID] Generated requestId: ${requestId}`); // Log the requestId for traceability
  } catch (error) {
    logger.error(`[REQUEST-ID] Failed to generate requestId: ${(error as Error).message}`);
  }

  next();
};

export default requestIdMiddleware;
