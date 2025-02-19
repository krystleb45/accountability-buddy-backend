import type { Request, Response, NextFunction } from "express";
import { validationResult, check } from "express-validator";

interface CustomValidationError {
  field: string;
  message: string;
}

/**
 * @desc Reusable validation middleware to handle validation errors.
 * @param {Request} req - The incoming request object.
 * @param {Response} res - The outgoing response object.
 * @param {NextFunction} next - The next middleware function.
 */
export const authValidationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors: CustomValidationError[] = errors.array().map((error) => {
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
      errors: formattedErrors,
    });
    return;
  }

  next();
};

// Common password validation rule for reuse
const passwordRule = [
  check("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    ),
];

// Validation rules for user registration
export const registerValidation = [
  check("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be between 3 and 20 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, underscores, and dashes",
    ),
  check("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  ...passwordRule,
  authValidationMiddleware,
];

// Validation rules for user login
export const loginValidation = [
  check("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  check("password").notEmpty().withMessage("Password is required"),
  authValidationMiddleware,
];

// Validation rules for password reset request
export const forgotPasswordValidation = [
  check("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  authValidationMiddleware,
];

// Validation rules for resetting the password
export const resetPasswordValidation = [...passwordRule, authValidationMiddleware];
