import Joi from "joi";
import type { Request, Response, NextFunction } from "express";
import logger from "../utils/winstonLogger";

export const ValidationService = {
  /**
   * Validate an email address.
   * @param email - The email address to validate.
   * @returns True if valid, otherwise false.
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    if (!isValid) logger.warn(`Invalid email format: ${email}`);
    return isValid;
  },

  /**
   * Validate a password with specific strength requirements.
   * @param password - The password to validate.
   * @returns True if valid, otherwise false.
   */
  validatePassword(password: string): boolean {
    // Minimum 8 characters, at least one letter, one number, and one special character
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const isValid = passwordRegex.test(password);
    if (!isValid)
      logger.warn(
        "Invalid password: Must be at least 8 characters long, include letters, numbers, and special characters.",
      );
    return isValid;
  },

  /**
   * Validate a username with specific requirements.
   * @param username - The username to validate.
   * @returns True if valid, otherwise false.
   */
  validateUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_.-]{3,30}$/; // Alphanumeric, dots, underscores, and hyphens (3-30 chars)
    const isValid = usernameRegex.test(username);
    if (!isValid)
      logger.warn(
        "Invalid username: Must be 3-30 characters long, containing only letters, numbers, dots, underscores, or hyphens.",
      );
    return isValid;
  },

  /**
   * Generic schema validation using Joi.
   * @param schema - The Joi schema to validate against.
   * @param data - The data object to validate.
   * @returns { valid: boolean; errors?: string[] } - Validation result.
   */
  validateSchema(
    schema: Joi.ObjectSchema,
    data: Record<string, unknown>,
  ): { valid: boolean; errors?: string[] } {
    const { error } = schema.validate(data, { abortEarly: false });
    if (error) {
      logger.warn("Schema validation errors:", error.details.map((d) => d.message));
      return {
        valid: false,
        errors: error.details.map((d) => d.message),
      };
    }
    return { valid: true };
  },

  /**
   * Middleware to validate request data against a Joi schema.
   * @param schema - The Joi schema to validate against.
   * @returns Express middleware function.
   */
  validateRequest(schema: Joi.ObjectSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error } = schema.validate(req.body, { abortEarly: false });
      if (error) {
        logger.warn(
          "Request validation errors:",
          error.details.map((d) => d.message),
        );
        res.status(400).json({
          status: "error",
          message: "Validation failed.",
          errors: error.details.map((d) => d.message),
        });
      } else {
        next();
      }
    };
  },
};

// Example usage of Joi for schema creation
export const exampleSchemas = {
  userRegistration: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .pattern(
        new RegExp(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/),
      )
      .required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

export default ValidationService;
