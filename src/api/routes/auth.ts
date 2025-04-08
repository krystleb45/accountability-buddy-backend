import type { Request, Response, NextFunction, Router } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";

import { login, register, refreshToken } from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";
import type { AuthenticatedRequest } from "../../types/AuthenticatedRequest";
import { logger } from "../../utils/winstonLogger";
import { ParamsDictionary } from "express-serve-static-core";
import { ParsedQs } from "qs";

const router: Router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many authentication attempts. Please try again later.",
});

const handleRouteErrors = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return async (req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>, next: (arg0: unknown) => void): Promise<void> => {
    try {
      await handler(req, res, next);
    } catch (error) {
      logger.error(`Error occurred: ${(error as Error).message}`);
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
      res.status(400).json({ errors: errors.array() });
      return;
    }
    await login(req, res, next);
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
      res.status(400).json({ errors: errors.array() });
      return;
    }
    await register(req, res, next);
  })
);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Auth]
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
      res.status(400).json({ errors: errors.array() });
      return;
    }
    await refreshToken(req, res, next);
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
