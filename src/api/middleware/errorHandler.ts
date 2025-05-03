// src/api/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from "express";
import { logger } from "../../utils/winstonLogger";

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
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function createError(
  message: string,
  statusCode = 500,
  details: unknown = null
): CustomError {
  return new CustomError(message, statusCode, details, true);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Unwrap our CustomError or fallback
  const {
    statusCode,
    message,
    isOperational,
    details,
  } = err instanceof CustomError
    ? err
    : {
      statusCode: 500,
      message: (err as Error).message || "Internal Server Error",
      isOperational: false,
      details: null,
    };

  // Always log the full error
  console.error(err);               // so you see the stack in your console
  logger.error(
    `Error: ${message} | Status: ${statusCode}` +
      (details ? ` | Details: ${JSON.stringify(details)}` : "")
  );

  // Build the JSON response
  const payload: Record<string, unknown> = {
    success: false,
    message: isOperational ? message : "An unexpected error occurred.",
  };

  // In dev, also send back the details and stack
  if (process.env.NODE_ENV === "development") {
    if (details != null) payload.details = details;
    if (err instanceof Error && err.stack) {
      payload.stack = err.stack;
    }
  } else if (isOperational && details != null) {
    // in prod only send details for operational errors
    payload.details = details;
  }

  res.status(statusCode).json(payload);
}
