import type { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";

/**
 * Middleware to handle validation results and send structured errors.
 */
export const validationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format validation errors into a structured response
    const formattedErrors = errors.array().map((error) => {
      // Safely access `param` with a fallback to "unknown"
      const field = "param" in error ? error.param : "unknown";
      return {
        field,
        message: error.msg,
      };
    });

    res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: formattedErrors,
    });

    return; // Terminate middleware execution
  }

  next(); // Proceed to the next middleware
};

/**
 * Validation for creating a subscription session.
 */
export const createSubscriptionValidation = [
  check("planId")
    .notEmpty()
    .withMessage("Plan ID is required.")
    .trim()
    .isString()
    .withMessage("Plan ID must be a valid string."),

  check("userId")
    .optional() // Optional since it can be derived from the auth token
    .trim()
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId."),

  validationMiddleware, // Attach reusable validation middleware
];

/**
 * Validation for canceling a subscription.
 */
export const cancelSubscriptionValidation = [
  check("subscriptionId")
    .notEmpty()
    .withMessage("Subscription ID is required.")
    .trim()
    .isString()
    .withMessage("Subscription ID must be a valid string."),

  validationMiddleware, // Attach reusable validation middleware
];

/**
 * Validation for checking subscription status.
 */
export const checkSubscriptionStatusValidation = [
  check("userId")
    .optional() // Typically derived from the token, but can be passed
    .trim()
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId."),

  validationMiddleware, // Attach reusable validation middleware
];
