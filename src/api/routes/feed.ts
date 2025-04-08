import type { Router, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as feedController from "../controllers/feedController";
import type { AuthenticatedRequest } from "../../types/AuthenticatedRequest";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

// Rate limiter to prevent abuse
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, msg: "Too many requests. Please try again later." },
});

/**
 * @swagger
 * tags:
 *   name: Feed
 *   description: User goal progress feed & social interaction
 */

/**
 * @swagger
 * /api/feed/post:
 *   post:
 *     summary: Create a new feed post
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - goalId
 *               - milestone
 *             properties:
 *               goalId:
 *                 type: string
 *               milestone:
 *                 type: string
 *               message:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Post created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/post",
  rateLimiter,
  protect,
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
 * @swagger
 * /api/feed:
 *   get:
 *     summary: Get all feed posts
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Posts retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  rateLimiter,
  protect,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await feedController.getFeed(req as any, res, next);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/feed/like/{id}:
 *   post:
 *     summary: Like a feed post
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post liked
 *       404:
 *         description: Post not found
 */
router.post(
  "/like/:id",
  rateLimiter,
  protect,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await feedController.addLike(req as any, res, next);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/feed/unlike/{id}:
 *   delete:
 *     summary: Unlike a post
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Like removed
 *       404:
 *         description: Post not found
 */
router.delete(
  "/unlike/:id",
  rateLimiter,
  protect,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response, next: NextFunction) => {
    try {
      await feedController.removeLike(req as any, res, next);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/feed/comment/{id}:
 *   post:
 *     summary: Add a comment to a post
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 200
 *     responses:
 *       200:
 *         description: Comment added
 *       400:
 *         description: Validation error
 *       404:
 *         description: Post not found
 */
router.post(
  "/comment/:id",
  rateLimiter,
  protect,
  [
    check("text", "Comment must not be empty").notEmpty(),
    check("text", "Comment must not exceed 200 characters").isLength({ max: 200 }),
  ],
  handleValidationErrors,
  async (
    req: AuthenticatedRequest<{ id: string }, {}, { text: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      await feedController.addComment(req as any, res, next);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/feed/comment/{postId}/{commentId}:
 *   delete:
 *     summary: Delete a comment from a post
 *     tags: [Feed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted
 *       404:
 *         description: Comment not found
 */
router.delete(
  "/comment/:postId/:commentId",
  rateLimiter,
  protect,
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
