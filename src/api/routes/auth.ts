import type { Request, Response, NextFunction, Router } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";

import * as authController from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";
import type { AuthenticatedRequest } from "../../types/AuthenticatedRequest";
import { logger } from "../../utils/winstonLogger";
import type { ParamsDictionary } from "express-serve-static-core";
import type { ParsedQs } from "qs";

const router: Router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many authentication attempts. Please try again later.",
});

// Wraps an async handler and logs+forwards errors
const handleRouteErrors = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return async (
    req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
    res: Response<any, Record<string, any>>,
    next: NextFunction
  ): Promise<void> => {
    try {
      await handler(req, res, next);
    } catch (error) {
      logger.error(`Auth route error: ${(error as Error).message}`);
      next(error);
    }
  };
};

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user login/register
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Successful login
 *       400:
 *         description: Validation error
 */
router.post(
  "/login",
  authLimiter,
  [
    check("email", "Valid email is required").isEmail(),
    check("password", "Password is required").notEmpty(),
  ],
  handleRouteErrors(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    await authController.login(req, res, next);
  })
);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - username
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               username:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
router.post(
  "/register",
  authLimiter,
  [
    check("email", "Valid email is required").isEmail(),
    check("password", "Password must be at least 8 characters").isLength({ min: 8 }),
    check("username", "Username is required").notEmpty(),
  ],
  handleRouteErrors(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    await authController.register(req, res, next);
  })
);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       400:
 *         description: Invalid refresh token
 */
router.post(
  "/refresh-token",
  handleRouteErrors(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }
    await authController.refreshToken(req, res, next);
  })
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user info
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/me",
  protect,
  handleRouteErrors(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    res.status(200).json({
      success: true,
      data: {
        id: authReq.user.id,
        email: authReq.user.email,
        role: authReq.user.role,
        isAdmin: authReq.user.isAdmin || false,
        permissions: authReq.user.permissions || [],
      },
    });
  })
);

export default router;
