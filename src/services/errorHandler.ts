import type { Request, Response, NextFunction } from "express";
import logger from "../utils/winstonLogger"; // Logger for error logging

/**
 * Custom Error Class to handle different types of errors in a structured way.
 * @extends Error
 */
export class CustomError extends Error {
  statusCode: number;
  details?: Record<string, unknown> | Array<unknown>;

  /**
   * @param message - The error message
   * @param statusCode - HTTP status code (default: 500)
   * @param details - Additional details about the error (optional)
   */
  constructor(
    message: string,
    statusCode = 500,
    details: Record<string, unknown> | Array<unknown> | null = null,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.details = details || undefined;

    // Capture stack trace only in development for debugging
    if (process.env.NODE_ENV === "development") {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error Handling Middleware
 * @desc Handles errors in a consistent format across the application.
 * @param err - Error object
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 */
export const errorHandler = (
  err: CustomError | Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const statusCode = err instanceof CustomError ? err.statusCode : 500;
  const errorResponse: Record<string, unknown> = {
    success: false,
    message: err.message || "Internal Server Error",
  };

  // Include additional error details if available
  if (err instanceof CustomError && err.details) {
    errorResponse.details = err.details;
  }

  // Log the error with additional context
  logger.error(
    `Error: ${err.message} | Status: ${statusCode} | URL: ${req.originalUrl} | Method: ${req.method} | IP: ${req.ip} | User: ${
      req.user ? (req.user as { id: string }).id : "Guest"
    }`,
  );

  // Include stack trace in development environment
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Utility to wrap asynchronous functions for consistent error handling.
 * This utility avoids repetitive try-catch blocks in controllers.
 * @param fn - Async function to be wrapped
 * @returns Wrapped async function with error handling
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): ((req: Request, res: Response, next: NextFunction) => void) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Error Logging Middleware
 * Optionally, separate logging to a different service (e.g., external monitoring tool).
 * @param err - Error object
 * @param req - Express request object
 */
export const logError = (err: Error, req: Request): void => {
  // Add additional logging logic here (e.g., send error details to a monitoring service)
  logger.error(
    `Error Logged: ${err.message} | Status: ${(err as CustomError).statusCode || 500} | URL: ${req.originalUrl}`,
  );
};

export default {
  errorHandler,
  CustomError,
  asyncHandler,
  logError,
};
