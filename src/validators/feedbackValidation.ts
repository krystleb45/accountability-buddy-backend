import type { Request, Response, NextFunction } from "express";
import type { ValidationChain } from "express-validator";
import { check, validationResult } from "express-validator";

/**
 * Middleware to handle validation results and send errors in a structured format.
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next middleware function.
 */
export const feedbackValidationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => {
      if ("param" in error) {
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
      errors: formattedErrors,
    });
    return;
  }

  next();
};

/**
 * Validation rules for submitting feedback.
 */
export const submitFeedbackValidation: ValidationChain[] = [
  check("message")
    .notEmpty()
    .withMessage("Feedback message is required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Feedback message must be between 10 and 1000 characters")
    .trim()
    .escape(), // Sanitize to prevent XSS
  check("type")
    .optional()
    .isIn(["bug", "feature-request", "other"])
    .withMessage(
      "Invalid feedback type. Must be one of: bug, feature-request, or other.",
    ),
];
