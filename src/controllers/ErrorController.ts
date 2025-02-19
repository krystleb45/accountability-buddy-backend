import type { Request, Response } from "express";
import logger from "../utils/winstonLogger";

/**
 * @desc    Handle custom application errors
 * @param   err - The error object
 * @param   req - Express request object
 * @param   res - Express response object
 */
export const errorHandler = (
  err: {
    statusCode?: number;
    message?: string;
    errors?: Array<{ param: string; msg: string }> | null;
    name?: string;
    stack?: string;
    code?: number;
    keyValue?: Record<string, string>;
    path?: string;
    value?: string;
  },
  req: Request,
  res: Response,
): void => {
  const statusCode = err.statusCode || 500;
  const success = false;
  let message = err.message || "An unexpected error occurred.";
  let errors: Array<{ field: string; message: string }> | null = null;

  // Handle validation errors
  if (err.errors) {
    message = "Validation error(s) occurred.";
    errors = err.errors.map((error) => ({
      field: error.param,
      message: error.msg,
    }));
  }

  // Handle MongoDB cast errors (invalid IDs)
  if (err.name === "CastError" && err.path) {
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Handle duplicate field errors in MongoDB
  if (err.code === 11000 && err.keyValue) {
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for ${field}: "${err.keyValue[field]}". Please use a different value.`;
  }

  // Handle JWT-related errors
  if (err.name === "JsonWebTokenError") {
    message = "Invalid token. Please log in again.";
  } else if (err.name === "TokenExpiredError") {
    message = "Your token has expired. Please log in again.";
  }

  // Handle rate-limiting errors
  if (err.name === "RateLimitError") {
    message = "Too many requests. Please try again later.";
  }

  // Log the error details
  logger.error({
    message: err.message || "An error occurred",
    stack: err.stack || "No stack trace available",
    path: req.originalUrl,
    method: req.method,
    statusCode,
  });

  // Send the error response
  res.status(statusCode).json({
    success,
    message,
    errors,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};
