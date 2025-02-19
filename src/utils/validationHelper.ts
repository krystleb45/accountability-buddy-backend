import mongoose from "mongoose";

/**
 * @desc    Checks if an email is valid using a regular expression.
 * @param   {string} email - The email address to validate.
 * @returns {boolean} - Returns true if the email is valid, otherwise false.
 */
export const isValidEmail = (email: string): boolean => {
  if (typeof email !== "string") return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * @desc    Checks if a password is strong.
 *          A strong password should have at least 8 characters, including:
 *          - One uppercase letter
 *          - One lowercase letter
 *          - One number
 *          - One special character
 * @param   {string} password - The password to validate.
 * @returns {boolean} - Returns true if the password is strong, otherwise false.
 */
export const isStrongPassword = (password: string): boolean => {
  if (typeof password !== "string") return false;

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * @desc    Checks if a string is a valid MongoDB ObjectId.
 * @param   {string} id - The string to check.
 * @returns {boolean} - Returns true if the string is a valid ObjectId, otherwise false.
 */
export const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * @desc    Checks if a phone number is valid based on international format.
 *          A valid phone number should start with a '+' and include 8 to 15 digits.
 * @param   {string} phone - The phone number to validate.
 * @returns {boolean} - Returns true if the phone number is valid, otherwise false.
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  if (typeof phone !== "string") return false;

  const phoneRegex = /^\+[1-9]\d{7,14}$/;
  return phoneRegex.test(phone);
};

/**
 * @desc    Checks if a date string is valid according to ISO 8601 format.
 * @param   {string} date - The date string to validate.
 * @returns {boolean} - Returns true if the date is valid, otherwise false.
 */
export const isValidISODate = (date: string): boolean => {
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime()) && parsedDate.toISOString() === date;
};

/**
 * @desc    Checks if a URL is valid.
 * @param   {string} url - The URL to validate.
 * @returns {boolean} - Returns true if the URL is valid, otherwise false.
 */
export const isValidURL = (url: string): boolean => {
  if (typeof url !== "string") return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * @desc    Validates if a string is within a specified length range.
 * @param   {string} str - The string to validate.
 * @param   {number} min - Minimum length.
 * @param   {number} max - Maximum length.
 * @returns {boolean} - Returns true if the string length is within the range, otherwise false.
 */
export const isValidStringLength = (
  str: string,
  min = 1,
  max = 255,
): boolean => {
  if (typeof str !== "string") return false;
  return str.length >= min && str.length <= max;
};

/**
 * @desc    Validates if a number is within a specified range.
 * @param   {number} num - The number to validate.
 * @param   {number} min - Minimum value.
 * @param   {number} max - Maximum value.
 * @returns {boolean} - Returns true if the number is within the range, otherwise false.
 */
export const isValidNumberRange = (
  num: number,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
): boolean => {
  if (typeof num !== "number") return false;
  return num >= min && num <= max;
};
