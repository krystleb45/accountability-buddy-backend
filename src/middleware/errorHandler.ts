import type { Request, Response, NextFunction } from "express";
import logger from "../utils/winstonLogger";

// Define the extended error interface
interface CustomError extends Error {
  statusCode?: number; // HTTP status code
  isOperational?: boolean; // True for predictable, operational errors
  details?: unknown; // Additional details about the error
}

// Utility to create custom errors
export const createError = (
  message: string,
  statusCode = 500,
  isOperational = true,
  details: unknown = null,
): CustomError => {
  const error: CustomError = new Error(message) as CustomError;
  error.statusCode = statusCode;
  error.isOperational = isOperational;
  error.details = details;
  return error;
};

// Middleware to handle errors
export const errorHandler = (
  err: CustomError,
  _req: Request,
  res: Response,
  next: NextFunction, // Ensure proper typing for Express error middleware
): void => {
  // Log the error
  logger.error(
    `Error: ${err.message}, Status: ${err.statusCode || 500}, Details: ${
      err.details || "N/A"
    }`,
  );

  // Prepare the response
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: err.isOperational ? err.message : "An unexpected error occurred.",
    ...(err.isOperational && err.details ? { details: err.details } : {}),
  };

  res.status(statusCode).json(response);

  // Explicitly call 'next' for compatibility with Express
  next();
};
