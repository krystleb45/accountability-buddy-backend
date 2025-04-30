// src/api/services/ValidationService.ts
import Joi from "joi";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { logger } from "../../utils/winstonLogger";

const ValidationService = {
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email);
    if (!isValid) logger.warn(`Invalid email format: ${email}`);
    return isValid;
  },

  validatePassword(password: string): boolean {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const isValid = passwordRegex.test(password);
    if (!isValid) {
      logger.warn(
        "Invalid password: Must be at least 8 chars, include letters, numbers, and special chars."
      );
    }
    return isValid;
  },

  validateUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_.-]{3,30}$/;
    const isValid = usernameRegex.test(username);
    if (!isValid) {
      logger.warn(
        "Invalid username: 3–30 chars, letters/numbers/dots/underscores/hyphens only."
      );
    }
    return isValid;
  },

  validateSchema(
    schema: Joi.ObjectSchema,
    data: Record<string, unknown>
  ): { valid: boolean; errors?: string[] } {
    const { error } = schema.validate(data, { abortEarly: false });
    if (error) {
      const errors = error.details.map((d) => d.message);
      logger.warn("Schema validation errors:", errors);
      return { valid: false, errors };
    }
    return { valid: true };
  },

  /**
   * Middleware to validate req.body against a Joi schema.
   * If validation fails, responds 400 and ends; otherwise calls next().
   */
  validateRequest(schema: Joi.ObjectSchema): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error } = schema.validate(req.body, { abortEarly: false });
      if (error) {
        const errors = error.details.map((d) => d.message);
        logger.warn("ValidationService: request validation failed:", errors);
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
        return;
      }
      next();
    };
  },
};

// Example Joi schemas for reuse:
export const exampleSchemas = {
  userRegistration: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .pattern(
        new RegExp(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      )
      .required(),
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

export default ValidationService;
