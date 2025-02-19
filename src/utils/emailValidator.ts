import validator from "validator";

/**
 * @desc Validates if a given email address is properly formatted.
 * @param {string} email - The email address to validate.
 * @returns {boolean} - Returns true if the email is valid, otherwise false.
 */
export const isValidEmail = (email: string): boolean => {
  if (typeof email !== "string") return false; // Ensure email is a string

  // Use validator.js's built-in email validation function
  return validator.isEmail(email);
};

/**
 * @desc Sanitizes an email address to prevent potential XSS attacks.
 *       Removes unnecessary spaces and converts to lowercase.
 * @param {string} email - The email address to sanitize.
 * @returns {string} - Returns the sanitized email.
 */
export const sanitizeEmail = (email: string): string => {
  if (typeof email !== "string") return ""; // Ensure email is a string

  // Trim spaces, convert to lowercase, and normalize using validator.js
  return validator.normalizeEmail(email.trim().toLowerCase()) || "";
};
