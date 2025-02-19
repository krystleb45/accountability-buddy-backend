import type { Request, Response, NextFunction } from "express";
import logger from "./winstonLogger"; // Replace with your logger utility

/**
 * @desc Custom Error Class to handle error responses in a structured way.
 */
class ErrorResponse extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message); // Call the parent class constructor (Error)
    this.statusCode = statusCode; // Default to 500 if no statusCode is provided
    this.isOperational = true; // Mark the error as operational (to distinguish from programming errors)

    // Capture the stack trace for debugging purposes
    if (process.env.NODE_ENV === "development") {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error handling middleware that sends structured error responses.
 */
const errorHandler = (
  err: Error & { statusCode?: number; code?: number; value?: string; errors?: Record<string, { message: string }> },
  req: Request,
  res: Response,
  _next: NextFunction, 
): void => {
  let error: ErrorResponse | Error & { statusCode?: number } = { ...err };
  error.message = err.message;

  // Log error details for debugging
  logger.error("Error occurred", {
    message: err.message,
    statusCode: error.statusCode || 500,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Handle Mongoose bad ObjectId error (e.g., invalid resource IDs)
  if (err.name === "CastError") {
    const message = `Resource not found with ID: ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Handle Mongoose duplicate key errors (e.g., unique fields)
  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = new ErrorResponse(message, 400);
  }

  // Handle Mongoose validation errors
  if (err.name === "ValidationError" && err.errors) {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = new ErrorResponse(message, 400);
  }

  // Handle JWT Token Expired error
  if (err.name === "TokenExpiredError") {
    const message = "Session expired, please log in again";
    error = new ErrorResponse(message, 401);
  }

  // Handle JWT Token Invalid error
  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token, please log in again";
    error = new ErrorResponse(message, 401);
  }

  // Handle Sequelize validation errors (if applicable)
  if (err.name === "SequelizeValidationError" && Array.isArray(err.errors)) {
    const message = err.errors.map((e) => e.message).join(", ");
    error = new ErrorResponse(message, 400);
  }

  // Default to internal server error if no specific error is identified
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Server Error",
    // Include stack trace in development mode for easier debugging
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

export { ErrorResponse, errorHandler };
