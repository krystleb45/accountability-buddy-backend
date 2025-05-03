// src/api/routes/leaderboard.ts
import { Router, Request, Response } from "express";
import { check } from "express-validator";
import { protect, restrictTo } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import catchAsync from "../utils/catchAsync";
import {
  getLeaderboard,
  getUserLeaderboardPosition,
  resetLeaderboard,
  updateLeaderboardForUser,
} from "../controllers/LeaderboardController";

const router = Router();

/**
 * GET /api/leaderboard
 * Public: returns paginated, cached leaderboard
 */
router.get("/", getLeaderboard);

/**
 * GET /api/leaderboard/user-position
 * Protected: returns the current user’s position
 */
router.get(
  "/user-position",
  protect,
  getUserLeaderboardPosition
);

/**
 * DELETE /api/leaderboard/reset
 * Admin-only: resets the leaderboard
 */
router.delete(
  "/reset",
  protect,
  restrictTo("admin"),
  resetLeaderboard
);

/**
 * POST /api/leaderboard/update-points
 * Admin-only: trigger points recalculation for a user
 */
router.post(
  "/update-points",
  protect,
  restrictTo("admin"),
  check("userId", "User ID is required and must be a valid ID").isMongoId(),
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body;
    await updateLeaderboardForUser(userId);
    res.status(200).json({
      success: true,
      message: "Leaderboard updated successfully.",
    });
  })
);

export default router;
