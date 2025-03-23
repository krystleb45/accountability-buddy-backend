import type { Request, Response, NextFunction, Router } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";

import { login, register, refreshToken } from "../../src/controllers/authController";
import authMiddleware from "../middleware/authMiddleware";
import type { AuthenticatedRequest } from "../types/AuthenticatedRequest";
import { logger } from "../utils/winstonLogger";

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
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
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
      return;
    }

    await login(req, res, next);
  })
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
    check("password", "Password must be at least 8 characters").isLength({ min: 8 }),
    check("username", "Username is required").notEmpty(),
  ],
  handleRouteErrors(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    await register(req, res, next);
  })
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
      return;
    }

    await refreshToken(req, res, next);
  })
);

/**
 * @route   GET /auth/me
 * @desc    Get current authenticated user info
 * @access  Private
 */
router.get(
  "/me",
  authMiddleware,
  handleRouteErrors(async (req: Request, res: Response): Promise<void> => {
    const typedReq = req as AuthenticatedRequest;

    if (!typedReq.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: typedReq.user.id,
        email: typedReq.user.email,
        role: typedReq.user.role,
        isAdmin: typedReq.user.isAdmin || false,
        permissions: typedReq.user.permissions || [],
      },
    });
  })
);

export default router;
