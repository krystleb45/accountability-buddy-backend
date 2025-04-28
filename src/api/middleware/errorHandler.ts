import type { Request, Response, NextFunction } from "express";
import { logger } from "../../utils/winstonLogger";

// Extend the built-in Error type with our own fields
interface CustomError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  details?: unknown;
}

// Factory to build predictable (“operational”) errors
export const createError = (
  message: string,
  statusCode = 500,
  isOperational = true,
  details: unknown = null,
): CustomError => {
  const err = new Error(message) as CustomError;
  err.statusCode = statusCode;
  err.isOperational = isOperational;
  err.details = details;
  return err;
};

// Central error-handling middleware
export const errorHandler = (
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Log everything
  logger.error(
    `Error: ${err.message} | Status: ${err.statusCode || 500}` +
    (err.details ? ` | Details: ${JSON.stringify(err.details)}` : "")
  );

  // Build the payload
  const status = err.statusCode || 500;
  const payload: Record<string, unknown> = {
    success: false,
    message: err.isOperational ? err.message : "An unexpected error occurred."
  };
  if (err.isOperational && err.details) {
    payload.details = err.details;
  }

  // Send once and end
  res.status(status).json(payload);
};
