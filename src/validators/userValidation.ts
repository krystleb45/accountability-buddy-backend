import type { ValidationChain } from "express-validator";
import { check } from "express-validator";

/**
 * Validation for registering a new user.
 */
export const registerUserValidation: ValidationChain[] = [
  check("username")
    .notEmpty()
    .withMessage("Username is required.")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters.")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Username can only contain letters, numbers, underscores, and dashes.")
    .escape(),

  check("email")
    .notEmpty()
    .withMessage("Email is required.")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  check("password")
    .notEmpty()
    .withMessage("Password is required.")
    .trim()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long.")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    ),
];

/**
 * Validation for updating the user profile.
 */
export const updateUserProfileValidation: ValidationChain[] = [
  check("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters.")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage("Username can only contain letters, numbers, underscores, and dashes.")
    .escape(),

  check("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  check("password")
    .optional()
    .trim()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long.")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    ),
];

/**
 * Validation for changing the user password.
 */
export const changePasswordValidation: ValidationChain[] = [
  check("currentPassword").notEmpty().withMessage("Current password is required."),
  check("newPassword")
    .notEmpty()
    .withMessage("New password is required.")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long.")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/)
    .withMessage(
      "New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    ),
];

/**
 * Validation for deleting a user account.
 */
export const deleteUserAccountValidation: ValidationChain[] = [
  check("password").notEmpty().withMessage("Password is required to delete the account."),
];
