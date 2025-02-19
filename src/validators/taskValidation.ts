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
 * Validation for creating a task.
 */
export const createTaskValidation = [
  check("title")
    .notEmpty()
    .withMessage("Task title is required.")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Task title must be between 3 and 100 characters.")
    .escape(), // Sanitize to prevent XSS

  check("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot be more than 500 characters.")
    .escape(), // Sanitize to prevent XSS

  check("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Due date must be a valid ISO 8601 date.")
    .toDate()
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("Due date must be in the future.");
      }
      return true;
    }),

  check("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be one of: low, medium, high."),

  check("status")
    .optional()
    .isIn(["pending", "in-progress", "completed"])
    .withMessage("Status must be one of: pending, in-progress, completed."),

  validationMiddleware, // Attach reusable validation middleware
];

/**
 * Validation for updating a task.
 */
export const updateTaskValidation = [
  check("taskId")
    .notEmpty()
    .withMessage("Task ID is required.")
    .isMongoId()
    .withMessage("Task ID must be a valid Mongo ID"),

  check("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Task title must be between 3 and 100 characters.")
    .escape(), // Sanitize to prevent XSS

  check("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description cannot be more than 500 characters.")
    .escape(), // Sanitize to prevent XSS

  check("dueDate")
    .optional()
    .isISO8601()
    .withMessage("Due date must be a valid ISO 8601 date.")
    .toDate()
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("Due date must be in the future.");
      }
      return true;
    }),

  check("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("Priority must be one of: low, medium, high."),

  check("status")
    .optional()
    .isIn(["pending", "in-progress", "completed"])
    .withMessage("Status must be one of: pending, in-progress, completed."),

  validationMiddleware, // Attach reusable validation middleware
];

/**
 * Validation for deleting a task.
 */
export const deleteTaskValidation = [
  check("taskId")
    .notEmpty()
    .withMessage("Task ID is required.")
    .isMongoId()
    .withMessage("Task ID must be a valid Mongo ID"),

  validationMiddleware, // Attach reusable validation middleware
];
