import type { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator";
import mongoose from "mongoose";



/**
 * Middleware to handle validation results and send structured errors.
 */
export const validateMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Map validation errors into a structured format
    const formattedErrors = errors.array().map((error) => ({
      field: "param" in error ? error.param : "unknown",
      message: error.msg,
    }));

    // Send structured errors as a response
    res.status(400).json({
      success: false,
      errors: formattedErrors,
    });

    return; // Explicitly terminate middleware execution
  }

  next(); // Proceed to the next middleware if no errors
};


/**
 * Validation for creating a group.
 */
export const createGroupValidation = [
  check("name")
    .trim()
    .notEmpty()
    .withMessage("Group name is required.")
    .isLength({ min: 3, max: 50 })
    .withMessage("Group name must be between 3 and 50 characters.")
    .matches(/^[a-zA-Z0-9\s]+$/)
    .withMessage("Group name must only contain letters, numbers, and spaces."),

  check("description")
    .optional()
    .trim()
    .escape() // Sanitize to prevent XSS
    .isLength({ max: 300 })
    .withMessage("Description cannot be more than 300 characters."),

  check("interests")
    .isArray({ min: 1 })
    .withMessage("You must select at least one interest.")
    .custom((interests: string[]) => interests.every((interest) => typeof interest === "string"))
    .withMessage("Interests must be an array of strings."),

  validateMiddleware,
];

/**
 * Validation for joining a group.
 */
export const joinGroupValidation = [
  check("groupId")
    .trim()
    .notEmpty()
    .withMessage("Group ID is required.")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid group ID."),

  check("userId")
    .trim()
    .notEmpty()
    .withMessage("User ID is required.")
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage("Invalid user ID."),

  validateMiddleware,
];
