import type { RequestHandler } from "express";
import { validationResult } from "express-validator";

/**
 * Middleware for handling validation errors.
 */
const handleValidationErrors: RequestHandler = (req, res, next): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return; // Ensure no further execution
  }

  next(); // Proceed to the next middleware if no errors
};

export default handleValidationErrors;
