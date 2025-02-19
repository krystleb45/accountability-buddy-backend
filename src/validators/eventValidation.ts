import type { Request, Response, NextFunction } from "express";
import type { ValidationChain } from "express-validator";
import { check, validationResult } from "express-validator";

/**
 * Middleware to handle validation results and send errors in a structured format.
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next middleware function.
 */
export const eventValidationMiddleware = (
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
 * Validation for creating an event.
 */
export const createEventValidation: ValidationChain[] = [
  check("title")
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters")
    .trim()
    .escape(),
  check("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must be under 500 characters")
    .trim()
    .escape(),
  check("scheduledAt")
    .notEmpty()
    .withMessage("Scheduled date and time are required")
    .isISO8601()
    .withMessage("Invalid date format (ISO 8601 required)"),
  check("participants")
    .optional()
    .isArray()
    .withMessage("Participants must be an array of user IDs"),
  check("participants.*")
    .optional()
    .isMongoId()
    .withMessage("Invalid participant ID"),
  check("status")
    .optional()
    .isIn(["upcoming", "completed", "canceled"])
    .withMessage("Status must be one of: upcoming, completed, canceled"),
];

/**
 * Validation for updating an event.
 */
export const updateEventValidation: ValidationChain[] = [
  check("eventId")
    .notEmpty()
    .withMessage("eventId is required")
    .isMongoId()
    .withMessage("Invalid eventId"),
  check("title")
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be between 3 and 100 characters")
    .trim()
    .escape(),
  check("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description must be under 500 characters")
    .trim()
    .escape(),
  check("scheduledAt")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format (ISO 8601 required)"),
  check("participants")
    .optional()
    .isArray()
    .withMessage("Participants must be an array of user IDs"),
  check("participants.*")
    .optional()
    .isMongoId()
    .withMessage("Invalid participant ID"),
  check("status")
    .optional()
    .isIn(["upcoming", "completed", "canceled"])
    .withMessage("Status must be one of: upcoming, completed, canceled"),
];

/**
 * Validation for joining an event.
 */
export const joinEventValidation: ValidationChain[] = [
  check("eventId")
    .notEmpty()
    .withMessage("eventId is required")
    .isMongoId()
    .withMessage("Invalid eventId"),
  check("userId")
    .notEmpty()
    .withMessage("userId is required")
    .isMongoId()
    .withMessage("Invalid userId"),
];
