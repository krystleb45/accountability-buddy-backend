// src/utils/catchAsync.ts
import type { RequestHandler, Response, NextFunction } from "express";
import { logger } from "../../utils/winstonLogger";

/**
 * Wraps async route handlers so errors bubble to Express.
 */
const catchAsync = <T = any>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
  return async (req, res, next) => {
    try {
      // now returns a Promise<void>
      await fn(req as T, res, next);
    } catch (err) {
      logger.error(
        `Error in async handler: ${err instanceof Error ? err.message : String(err)}`,
        {
          stack: err instanceof Error ? err.stack : undefined,
          requestUrl: (req as any).originalUrl,
          method: req.method,
        }
      );
      next(err);
    }
  };
};

export default catchAsync;
