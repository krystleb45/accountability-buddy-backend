import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import sanitize from "mongo-sanitize";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/authMiddleware";
import checkSubscription from "../middleware/checkSubscription";
import * as groupController from "../controllers/groupController";
import handleValidationErrors from "../middleware/handleValidationErrors"; // Adjust the path


import logger from "../utils/winstonLogger";

const router: Router = express.Router();

/**
 * Rate limiter to prevent abuse of group-related endpoints.
 */
const groupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 requests per window
  message: "Too many requests, please try again later.",
});



/**
 * @route   POST /group/create
 * @desc    Create a new group (Standard and Premium Users Only)
 * @access  Private
 */
router.post(
  "/create",
  authMiddleware,
  checkSubscription("standard"),
  groupLimiter,
  [
    check("name", "Group name is required").notEmpty(),
    check("name", "Group name must not exceed 100 characters").isLength({ max: 100 }),
    check("interests", "Group interests must be an array").isArray(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    sanitize(req.body);

    try {
      const group = await groupController.createGroup(req, res, next); // Use controller function
      res.status(201).json({ success: true, group });
    } catch (err) {
      logger.error("Error creating group", {
        error: err,
        userId: req.user?.id,
      });
      next(err); // Forward error to middleware
    }
  },
);

/**
 * @route   POST /group/join
 * @desc    Join an existing group
 * @access  Private
 */
router.post(
  "/join",
  authMiddleware,
  groupLimiter,
  [check("groupId", "Group ID is required").notEmpty().isMongoId()],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { groupId } = sanitize(req.body);

    try {
      const result = await groupController.joinGroup(req, res, next);
      res.json({ success: true, msg: "Joined the group successfully", result });
    } catch (err) {
      logger.error("Error joining group", {
        error: err,
        groupId,
        userId: req.user?.id,
      });
      next(err);
    }
  },
);

/**
 * @route   POST /group/leave
 * @desc    Leave a group
 * @access  Private
 */
router.post(
  "/leave",
  authMiddleware,
  [check("groupId", "Group ID is required").notEmpty().isMongoId()],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { groupId } = sanitize(req.body);

    try {
      const result = await groupController.leaveGroup(req, res, next);
      res.json({ success: true, msg: "Left the group successfully", result });
    } catch (err) {
      logger.error("Error leaving group", {
        error: err,
        groupId,
        userId: req.user?.id,
      });
      next(err);
    }
  },
);

/**
 * @route   GET /group/my-groups
 * @desc    Get user groups (Basic and above)
 * @access  Private
 */
router.get(
  "/my-groups",
  authMiddleware,
  checkSubscription("basic"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const groups = await groupController.getUserGroups(req, res, next);
      res.json({ success: true, groups });
    } catch (err) {
      logger.error("Error fetching user groups", {
        error: err,
        userId: req.user?.id,
      });
      next(err);
    }
  },
);

export default router;
