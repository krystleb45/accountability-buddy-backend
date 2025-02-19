import type { Request, Response, NextFunction } from "express";
import type { ValidationChain } from "express-validator";
import { validationResult } from "express-validator";
import logger from "../utils/winstonLogger";

/**
 * Middleware for handling request validation
 * @param {ValidationChain[]} validations - Array of validation chains to run before proceeding
 * @returns Middleware function to validate requests
 */
const validationMiddleware = (validations: ValidationChain[] = []): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Run all validations
      for (const validation of validations) {
        await validation.run(req);
      }

      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Map validation errors into a structured format
        const errorDetails = errors.array().map((err) => {
          // Type guard to ensure `err` has `param` and `msg` properties
          if ("param" in err && typeof err.param === "string") {
            return {
              field: err.param,
              message: err.msg,
            };
          }
          return {
            field: "unknown",
            message: err.msg,
          };
        });

        // Log validation errors for debugging
        logger.warn("Validation failed", { errors: errorDetails });

        // Send structured error response
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: errorDetails,
        });

        return; // Ensure the function ends after sending a response
      }

      next(); // Proceed to the next middleware
    } catch (error) {
      // Log and handle unexpected errors
      logger.error("Unexpected error during validation", { error });

      res.status(500).json({
        success: false,
        message: "Internal server error during validation.",
      });
    }
  };
};

export default validationMiddleware;
