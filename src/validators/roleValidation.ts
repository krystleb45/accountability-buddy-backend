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
      message: "Validation failed",
      errors: formattedErrors,
    });

    return; // Terminate middleware execution
  }

  next(); // Proceed to the next middleware
};

/**
 * Validation for creating a role.
 */
export const createRoleValidation = [
  check("name")
    .notEmpty()
    .withMessage("Role name is required.")
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Role name must be between 3 and 50 characters.")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Role name must only contain letters and spaces.")
    .escape(), // Sanitize to prevent XSS

  check("permissions")
    .isArray({ min: 1 })
    .withMessage("Permissions must be an array with at least one permission.")
    .custom((permissions: unknown[]) =>
      permissions.every((permission) => typeof permission === "string"),
    )
    .withMessage("Each permission must be a valid string."),

  validationMiddleware, // Apply the reusable validation middleware
];

/**
 * Validation for updating a role.
 */
export const updateRoleValidation = [
  check("roleId")
    .notEmpty()
    .withMessage("Role ID is required.")
    .isMongoId()
    .withMessage("Role ID must be a valid Mongo ID"),

  check("name")
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage("Role name must be between 3 and 50 characters.")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Role name must only contain letters and spaces.")
    .escape(), // Sanitize to prevent XSS

  check("permissions")
    .optional()
    .isArray()
    .withMessage("Permissions must be an array.")
    .custom((permissions: unknown[]) =>
      permissions.every((permission) => typeof permission === "string"),
    )
    .withMessage("Each permission must be a valid string."),

  validationMiddleware, // Apply the reusable validation middleware
];

/**
 * Validation for assigning a role to a user.
 */
export const assignRoleValidation = [
  check("userId")
    .notEmpty()
    .withMessage("User ID is required.")
    .isMongoId()
    .withMessage("User ID must be a valid Mongo ID"),

  check("roleId")
    .notEmpty()
    .withMessage("Role ID is required.")
    .isMongoId()
    .withMessage("Role ID must be a valid Mongo ID"),

  validationMiddleware, // Apply the reusable validation middleware
];
