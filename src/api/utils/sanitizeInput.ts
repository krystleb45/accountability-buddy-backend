import xss from "xss";
import mongoSanitize from "mongo-sanitize";

/**
 * @desc    Sanitizes user input to prevent NoSQL injection and XSS attacks.
 *          Supports strings, objects, and arrays.
 * @param   {unknown} data - The data to be sanitized.
 * @returns {unknown} - The sanitized data.
 */
const sanitizeInput = (data: unknown): unknown => {
  if (typeof data === "string") {
    return sanitizeString(data);
  } else if (Array.isArray(data)) {
    return data.map((item) => sanitizeInput(item));
  } else if (typeof data === "object" && data !== null) {
    return sanitizeObject(data as Record<string, unknown>);
  }
  return data;
};

/**
 * @desc    Recursively sanitizes an object to prevent NoSQL injection and XSS attacks.
 * @param   {Record<string, unknown>} obj - The object to sanitize.
 * @returns {Record<string, unknown>} - The sanitized object.
 */
const sanitizeObject = (
  obj: Record<string, unknown>,
): Record<string, unknown> => {
  const sanitizedObj: Record<string, unknown> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === "object" && value !== null) {
        sanitizedObj[key] = sanitizeInput(value);
      } else if (typeof value === "string") {
        sanitizedObj[key] = sanitizeString(value);
      } else {
        sanitizedObj[key] = value;
      }
    }
  }

  return mongoSanitize(sanitizedObj) as Record<string, unknown>;
};

/**
 * @desc    Sanitizes a string input to prevent XSS attacks.
 * @param   {string} str - The string to sanitize.
 * @returns {string} - The sanitized string.
 */
const sanitizeString = (str: string): string => {
  return xss(str);
};

export default sanitizeInput;
