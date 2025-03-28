import type { Request, Response, NextFunction } from "express";
import { logger } from "../../utils/winstonLogger";

/**
 * @desc    A higher-order function to wrap asynchronous route handlers for error management.
 *          Automatically catches and forwards any error to the next middleware (e.g., error handler).
 * @param   fn - The async function (controller or route handler).
 * @returns A wrapped function that catches errors and forwards them to `next()`.
 */
const catchAsync = <T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>,
): ((req: T, res: Response, next: NextFunction) => void) => {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      logger.error(`Error in async handler: ${err instanceof Error ? err.message : String(err)}`, {
        stack: err instanceof Error ? err.stack : undefined,
        requestUrl: req.originalUrl,
        method: req.method,
      });
      next(err);
    });
  };
};

export default catchAsync;
