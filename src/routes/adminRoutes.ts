import type {
  Router,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import logger from "../utils/winstonLogger";
import {
  getAllUsers,
  updateUserRole,
  deleteUserAccount,
} from "../controllers/AdminController";
import authMiddleware from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";

import type { ParsedQs } from "qs";

// Explicitly define the router type
const router: Router = express.Router();

// Middleware to ensure only admins can access these routes
const isAdmin = roleBasedAccessControl(["admin"]);

/**
 * Utility function to handle route errors consistently
 */
const handleRouteErrors = (
  handler: (
    req: Request, // Fix: Use explicit Request type
    res: Response,
    next: NextFunction
  ) => Promise<void>,
): RequestHandler => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Fix: Explicit cast to Request
      const authReq = req as Request;
      await handler(authReq, res, next);
    } catch (error) {
      logger.error(`Error occurred: ${(error as Error).message}`);
      next(error); // Forward error to centralized error handling middleware
    }
  };
};

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (Admin only)
 * @access  Private
 */
router.get(
  "/users",
  authMiddleware as express.RequestHandler, // Fix: Explicitly cast middleware
  isAdmin as express.RequestHandler, // Fix: Explicitly cast role-based middleware
  handleRouteErrors(async (req: Request, res: Response, next: NextFunction) => {
    getAllUsers(req, res, next);
  }),
);

/**
 * @route   PATCH /api/admin/users/role
 * @desc    Update a user's role (Admin only)
 * @access  Private
 */
router.patch(
  "/users/role",
  [
    authMiddleware as express.RequestHandler, // Fix: Cast middleware
    isAdmin as express.RequestHandler, // Fix: Cast middleware
    check("userId", "User ID is required and must be valid")
      .notEmpty()
      .isMongoId(),
    check("role", "Role is required").notEmpty().isString(),
  ],
  handleRouteErrors(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn(`Validation failed: ${JSON.stringify(errors.array())}`);
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const result = updateUserRole(req, res, next); // Fix: Await async result
    res.status(200).json({ success: true, data: result });
  }),
);

/**
 * @desc    Delete a user account (Admin only)
 * @access  Private
 */
router.delete(
  "/users/:userId",
  [
    authMiddleware as express.RequestHandler, // Fix: Cast middleware
    isAdmin as express.RequestHandler, // Fix: Cast middleware
  ],
  async (
    req: Request<{ userId: string }, any, any, ParsedQs, Record<string, any>>,
    res: Response,
    next: NextFunction,
  ) => {
    deleteUserAccount(req, res, next); // Fix: Await async result
    logger.info(`User account deleted. UserID: ${req.params.userId}`);
    res
      .status(200)
      .json({ success: true, msg: "User account deleted successfully" });
  },
  
);

export default router;
