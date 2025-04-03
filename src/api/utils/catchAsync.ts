// src/utils/catchAsync.ts
import type { Response, NextFunction, RequestHandler } from "express";
import { logger } from "../../utils/winstonLogger";

/**
 * A higher-order function to wrap asynchronous route handlers for error management.
 * The generic parameter T is left unconstrained so that custom request types can be used.
 */
const catchAsync = <T = any>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req as T, res, next)).catch((err) => {
      logger.error(`Error in async handler: ${err instanceof Error ? err.message : String(err)}`, {
        stack: err instanceof Error ? err.stack : undefined,
        requestUrl: (req as any).originalUrl,
        method: req.method,
      });
      next(err);
    });
  };
};

export default catchAsync;
