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
      // Check if `error` has the `param` property
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
 * Validation for updating user or application settings.
 */
export const updateSettingsValidation = [
  // Validate notification preference
  check("notifications")
    .optional()
    .isBoolean()
    .withMessage("Notifications setting must be true or false."),

  // Validate language setting
  check("language")
    .optional()
    .isIn(["en", "es", "de", "fr", "jp"])
    .withMessage("Language must be one of: en, es, de, fr, jp."),

  // Validate privacy settings
  check("privacy")
    .optional()
    .isObject()
    .withMessage("Privacy settings must be an object.")
    .custom((privacy: Record<string, unknown>) => {
      const validKeys = ["profileVisibility", "showActivity", "shareData"];
      return Object.keys(privacy).every((key) => validKeys.includes(key));
    })
    .withMessage("Privacy settings contain invalid keys."),

  // Validate theme setting
  check("theme")
    .optional()
    .isIn(["light", "dark"])
    .withMessage("Theme must be either \"light\" or \"dark\"."),

  // Validate email preferences
  check("emailPreferences")
    .optional()
    .isObject()
    .withMessage("Email preferences must be an object.")
    .custom((prefs: Record<string, boolean>) => {
      const validPrefs = ["marketingEmails", "transactionalEmails", "updateEmails"];
      return Object.keys(prefs).every(
        (key) => validPrefs.includes(key) && typeof prefs[key] === "boolean",
      );
    })
    .withMessage("Email preferences must contain valid keys with boolean values."),

  // Validate timezone setting
  check("timezone")
    .optional()
    .isString()
    .withMessage("Timezone must be a string.")
    .isLength({ min: 1, max: 50 })
    .withMessage("Timezone must be between 1 and 50 characters.")
    .trim()
    .escape(), // Sanitize to prevent XSS

  // Attach reusable validation middleware
  validationMiddleware,
];
