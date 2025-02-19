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
    const formattedErrors = errors.array().map((error) => ({
      field: "param" in error && typeof error.param === "string" ? error.param : "unknown",
      message: error.msg,
    }));

    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: formattedErrors,
    });

    return; // Terminate the middleware execution
  }

  next(); // Proceed to the next middleware
};

/**
 * Validation for search queries.
 */
export const searchValidation = [
  check("query")
    .notEmpty()
    .withMessage("Search query is required.")
    .trim()
    .escape()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters."),

  check("filters")
    .optional()
    .isObject()
    .withMessage("Filters must be an object.")
    .custom((filters: Record<string, unknown>) => {
      return Object.values(filters).every(
        (value) => typeof value === "string" || typeof value === "number",
      );
    })
    .withMessage("All filter values must be strings or numbers."),

  check("sort")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort must be either \"asc\" or \"desc\"."),

  check("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be an integer greater than 0."),

  check("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be an integer between 1 and 100."),

  validationMiddleware,
];

