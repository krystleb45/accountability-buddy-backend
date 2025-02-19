import type { Router, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import authMiddleware from "../middleware/authMiddleware";
import * as feedController from "../controllers/feedController";
import type { AuthenticatedRequest } from "../types/request"; // Ensure correct path
import handleValidationErrors from "../middleware/handleValidationErrors"; // Adjust the path


const router: Router = express.Router();



// Rate limiter to prevent abuse
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, msg: "Too many requests. Please try again later." },
});

/**
 * @route   POST /post
 * @desc    Create a new post
 * @access  Private
 */
router.post(
  "/post",
  rateLimiter,
  authMiddleware,
  [
    check("goalId", "Goal ID is required").notEmpty().isMongoId(),
    check("milestone", "Milestone title is required").notEmpty(),
    check("message", "Message must not exceed 500 characters")
      .optional()
      .isLength({ max: 500 }),
  ],
  handleValidationErrors,
  async (
    req: AuthenticatedRequest<{}, {}, { goalId: string; milestone: string; message: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await feedController.createPost(req as any, res, next);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @route   GET /
 * @desc    Get all posts (feed)
 * @access  Private
 */
router.get(
  "/",
  rateLimiter,
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await feedController.getFeed(req as any, res, next);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @route   POST /like/:id
 * @desc    Like a post
 * @access  Private
 */
router.post(
  "/like/:id",
  rateLimiter,
  authMiddleware,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await feedController.addLike(req as any, res, next);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @route   DELETE /unlike/:id
 * @desc    Remove a like from a post
 * @access  Private
 */
router.delete(
  "/unlike/:id",
  rateLimiter,
  authMiddleware,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await feedController.removeLike(req as any, res, next);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @route   POST /comment/:id
 * @desc    Add a comment to a post
 * @access  Private
 */
router.post(
  "/comment/:id",
  rateLimiter,
  authMiddleware,
  [
    check("text", "Comment must not be empty").notEmpty(),
    check("text", "Comment must not exceed 200 characters").isLength({ max: 200 }),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest<{ id: string }, {}, { text: string }>, res: Response, next: NextFunction) => {
    try {
      await feedController.addComment(req as any, res, next);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @route   DELETE /comment/:postId/:commentId
 * @desc    Remove a comment from a post
 * @access  Private
 */
router.delete(
  "/comment/:postId/:commentId",
  rateLimiter,
  authMiddleware,
  async (
    req: AuthenticatedRequest<{ postId: string; commentId: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      await feedController.removeComment(req as any, res, next);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
