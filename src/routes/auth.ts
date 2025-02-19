import type { Request, Response, NextFunction, Router } from "express";
import express from "express";
import { check, validationResult } from "express-validator";

import { login, register, refreshToken } from "../../src/controllers/authController";
import rateLimit from "express-rate-limit";
import logger from "../utils/winstonLogger";

const router: Router = express.Router();

// Rate limiter for login and registration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: "Too many authentication attempts. Please try again later.",
});

/**
 * Utility function to handle errors consistently
 */
const handleRouteErrors = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): ((req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req, res, next);
    } catch (error) {
      logger.error(`Error occurred: ${(error as Error).message}`);
      next(error);
    }
  };
};

/**
 * @route   POST /auth/login
 * @desc    Log in a user
 * @access  Public
 */
router.post(
  "/login",
  authLimiter,
  [
    check("email", "Valid email is required").isEmail(),
    check("password", "Password is required").notEmpty(),
  ],
  handleRouteErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return; // FIXED: Explicit return for void type
    }

    // Pass the entire req, res, and next to the controller function
    await login(req, res, next); // FIXED: Now properly passes 3 arguments
  }),
);


/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  "/register",
  authLimiter,
  [
    check("email", "Valid email is required").isEmail(),
    check("password", "Password must be at least 8 characters").isLength({
      min: 8,
    }),
    check("username", "Username is required").notEmpty(),
  ],
  handleRouteErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return; // Explicit return to handle void type
    }

    // Call the register function with req, res, and next
    await register(req, res, next); // FIXED: Pass req, res, and next instead of sanitizedBody
  }),
);


/**
 * @route   POST /auth/refresh-token
 * @desc    Refresh authentication tokens
 * @access  Public
 */
router.post(
  "/refresh-token",
  handleRouteErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return; // Explicit return for void type
    }

    // Call the refreshToken function with all required arguments
    await refreshToken(req, res, next); // FIXED: Pass req, res, and next
  }),
);


export default router;
