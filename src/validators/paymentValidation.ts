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
    // Type guard to ensure the error has the 'param' property
    const formattedErrors = errors.array().map((error) => {
      if ("param" in error && typeof error.param === "string") {
        return {
          field: error.param,
          message: error.msg,
        };
      }
      return {
        field: "unknown",
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
 * Validation for creating a payment session.
 */
export const createPaymentSessionValidation = [
  check("planId")
    .notEmpty()
    .withMessage("Plan ID is required.")
    .trim()
    .isString()
    .withMessage("Plan ID must be a valid string"),

  check("userId")
    .optional() // Validate only if provided, as user ID may be derived from the token
    .trim()
    .isMongoId()
    .withMessage("A valid user ID is required"),

  validationMiddleware, // Reuse the validation middleware
];

/**
 * Validation for handling webhook events from Stripe.
 */
export const webhookValidation = [
  check("eventType")
    .notEmpty()
    .withMessage("Event type is required.")
    .trim()
    .isString()
    .withMessage("Event type must be a valid string"),

  check("eventData")
    .notEmpty()
    .withMessage("Event data is required.")
    .custom((value) => {
      if (typeof value !== "object" || Array.isArray(value) || value === null) {
        throw new Error("Event data must be a valid object.");
      }
      return true;
    }),

  validationMiddleware, // Reuse the validation middleware
];
