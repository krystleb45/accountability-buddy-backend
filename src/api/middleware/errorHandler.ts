// src/api/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from "express";
import { logger } from "../../utils/winstonLogger";

/**
 * A structured, operational error class.
 */
export class CustomError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    details: unknown = null,
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (details != null) this.details = details;
    // Restore prototype chain (necessary when targeting ES5)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Factory for creating operational errors.
 */
export function createError(
  message: string,
  statusCode = 500,
  details: unknown = null
): CustomError {
  return new CustomError(message, statusCode, details, true);
}

/**
 * Central error-handling middleware.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // If it's one of our CustomErrors, extract its info; else treat as a 500
  const { statusCode, message, isOperational, details } =
    err instanceof CustomError
      ? err
      : { statusCode: 500, message: (err as Error).message || "Internal Server Error", isOperational: false, details: null };

  // Log full details
  logger.error(
    `Error: ${message} | Status: ${statusCode}` +
      (details ? ` | Details: ${JSON.stringify(details)}` : "")
  );

  // Build response payload
  const payload: Record<string, unknown> = {
    success: false,
    message: isOperational ? message : "An unexpected error occurred."
  };
  if (isOperational && details != null) payload.details = details;

  res.status(statusCode).json(payload);
}
