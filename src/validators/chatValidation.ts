import type { Request, Response, NextFunction } from "express";
import type { ValidationError, ValidationChain } from "express-validator";
import { check, validationResult } from "express-validator";

/**
 * Middleware to handle validation results and send errors in a structured format.
 * @param req - Express request object.
 * @param res - Express response object.
 * @param next - Express next function.
 */
export const chatValidationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error: ValidationError) => ({
      field: "param" in error ? error.param : "unknown",
      message: error.msg,
    }));

    res.status(400).json({
      success: false,
      errors: formattedErrors,
    });
    return;
  }

  next();
};

/**
 * Generates a common validation rule for Mongo ID fields.
 * @param field - The field name to validate.
 * @returns Array of validation chains for the specified field.
 */
const mongoIdRule = (field: string): ValidationChain[] => [
  check(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .isMongoId()
    .withMessage(`Invalid ${field}`),
];

/**
 * Validation rules for sending a message.
 */
export const sendMessageValidation = [
  check("message")
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ min: 1, max: 1000 })
    .withMessage("Message must be between 1 and 1000 characters")
    .trim()
    .escape(),
  ...mongoIdRule("groupId"),
  chatValidationMiddleware,
];

/**
 * Validation rules for creating a group.
 */
export const createGroupValidation = [
  check("name")
    .notEmpty()
    .withMessage("Group name is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Group name must be between 3 and 50 characters")
    .trim()
    .escape(),
  check("members")
    .isArray({ min: 1 })
    .withMessage("Group members must be an array with at least one member")
    .bail(),
  check("members.*")
    .isMongoId()
    .withMessage("Each group member ID must be a valid Mongo ID"),
  chatValidationMiddleware,
];

/**
 * Validation rules for joining a group.
 */
export const joinGroupValidation = [
  ...mongoIdRule("groupId"),
  ...mongoIdRule("userId"),
  chatValidationMiddleware,
];
