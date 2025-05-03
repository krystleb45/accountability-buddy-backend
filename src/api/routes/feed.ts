// src/api/routes/feed.ts
import { Router } from "express";
import { check, param } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as feedController from "../controllers/feedController";

const router = Router();

// throttle to 10 requests per 15 minutes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, msg: "Too many requests. Please try again later." },
});

/**
 * POST /api/feed/post
 */
router.post(
  "/post",
  limiter,
  protect,
  [
    check("goalId", "Goal ID is required").notEmpty().isMongoId(),
    check("milestone", "Milestone title is required").notEmpty(),
    check("message", "Message must not exceed 500 characters")
      .optional()
      .isLength({ max: 500 }),
  ],
  handleValidationErrors,
  feedController.createPost
);

/**
 * GET /api/feed
 */
router.get(
  "/",
  limiter,
  protect,
  feedController.getFeed
);

/**
 * POST /api/feed/like/:id
 */
router.post(
  "/like/:id",
  limiter,
  protect,
  [ param("id", "Invalid post ID").isMongoId() ],
  handleValidationErrors,
  feedController.addLike
);

/**
 * DELETE /api/feed/unlike/:id
 */
router.delete(
  "/unlike/:id",
  limiter,
  protect,
  [ param("id", "Invalid post ID").isMongoId() ],
  handleValidationErrors,
  feedController.removeLike
);

/**
 * POST /api/feed/comment/:id
 */
router.post(
  "/comment/:id",
  limiter,
  protect,
  [
    param("id", "Invalid post ID").isMongoId(),
    check("text", "Comment must not be empty").notEmpty(),
    check("text", "Comment must not exceed 200 characters").isLength({ max: 200 }),
  ],
  handleValidationErrors,
  feedController.addComment
);

/**
 * DELETE /api/feed/comment/:postId/:commentId
 */
router.delete(
  "/comment/:postId/:commentId",
  limiter,
  protect,
  [
    param("postId", "Invalid post ID").isMongoId(),
    param("commentId", "Invalid comment ID").isMongoId(),
  ],
  handleValidationErrors,
  feedController.removeComment
);

export default router;
