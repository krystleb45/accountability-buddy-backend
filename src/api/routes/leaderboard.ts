import { Request, Response, Router } from "express";
import {
  getLeaderboard,
  getUserLeaderboardPosition,
  resetLeaderboard,
  updateLeaderboard,
} from "../controllers/LeaderboardController";
import { protect, restrictTo } from "../middleware/authMiddleware";
import { logger } from "../../utils/winstonLogger";

const router = Router();

/**
 * @route   GET /api/leaderboard
 * @desc    Get paginated leaderboard with caching
 * @access  Public
 */
router.get("/", getLeaderboard);

/**
 * @route   GET /api/leaderboard/user-position
 * @desc    Get current user's position on the leaderboard
 * @access  Private
 */
router.get("/user-position", protect, getUserLeaderboardPosition);

/**
 * @route   DELETE /api/leaderboard/reset
 * @desc    Reset the entire leaderboard (Admin only)
 * @access  Private/Admin
 */
router.delete("/reset", protect, restrictTo("admin"), resetLeaderboard);

/**
 * @route   POST /api/leaderboard/update-points
 * @desc    Trigger update to a user's leaderboard stats (Admin only)
 * @access  Private/Admin
 */
router.post(
  "/update-points",
  protect,
  restrictTo("admin"),
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, message: "User ID is required." });
      return;
    }

    try {
      await updateLeaderboard(userId);
      res.status(200).json({
        success: true,
        message: "Leaderboard updated successfully.",
      });
    } catch (error) {
      logger.error(
        `❌ Error updating leaderboard via /update-points: ${(error as Error).message}`
      );
      res.status(500).json({
        success: false,
        message: "Failed to update leaderboard.",
      });
    }
  }
);

export default router;
