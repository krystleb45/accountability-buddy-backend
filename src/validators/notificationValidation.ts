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

    return; // Terminate the middleware execution
  }

  next(); // Proceed to the next middleware
};

/**
 * Validation for sending a notification.
 */
export const sendNotificationValidation = [
  check("type")
    .notEmpty()
    .withMessage("Notification type is required.")
    .trim()
    .isIn(["email", "sms", "app"])
    .withMessage("Notification type must be either email, sms, or app."),

  // Conditional validation for 'to' field based on notification type
  check("to")
    .if(check("type").equals("email"))
    .notEmpty()
    .withMessage("Recipient email is required for email notifications.")
    .trim()
    .isEmail()
    .withMessage("A valid email is required for email notifications.")
    .normalizeEmail(),

  check("to")
    .if(check("type").equals("sms"))
    .notEmpty()
    .withMessage("Recipient phone number is required for SMS notifications.")
    .trim()
    .matches(/^\+[1-9]\d{1,14}$/)
    .withMessage("A valid phone number is required for SMS notifications."),

  // Validation for subject if the notification type is email
  check("subject")
    .if(check("type").equals("email"))
    .notEmpty()
    .withMessage("Subject is required for email notifications.")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Subject must be between 3 and 100 characters.")
    .escape(),

  // Message validation for all notification types
  check("message")
    .notEmpty()
    .withMessage("Message is required.")
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage("Message must be between 10 and 1000 characters.")
    .escape(),

  validationMiddleware, // Reuse the single validation middleware
];
