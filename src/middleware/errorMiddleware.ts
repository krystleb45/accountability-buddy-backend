import type { Request, Response, NextFunction } from "express";
import logger from "../utils/winstonLogger";

interface CustomError extends Error {
  status?: number;
  details?: any;
}

const errorMiddleware = (
  error: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction, 
): void => {
  // Log the error
  logger.error(
    `Error: ${error.message}, Status: ${error.status || 500}, Path: ${
      req.path
    }, IP: ${req.ip}`,
  );

  // Send a generic or detailed response based on environment
  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { details: error.details }),
  });
};

export default errorMiddleware;
