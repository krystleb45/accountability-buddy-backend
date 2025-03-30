import { Router, Request, Response } from "express";
import { getLeaderboard, getUserLeaderboardPosition, resetLeaderboard, updateLeaderboard } from "../controllers/LeaderboardController";
import { protect, restrictTo } from "../middleware/authMiddleware"; // Corrected import
import { logger } from "../../utils/winstonLogger"; // Assuming you have a logging utility

const router = Router();

// Route to fetch the leaderboard
// GET /api/leaderboard?limit=10&page=1
router.get("/", getLeaderboard);

// Route to get the user's leaderboard position
// GET /api/leaderboard/user-position
router.get("/user-position", protect, getUserLeaderboardPosition);

// Route to reset the leaderboard (Admin only)
// DELETE /api/leaderboard/reset
router.delete("/reset", protect, restrictTo("admin"), resetLeaderboard);

// Route to update the leaderboard points for a user (Admin only)
router.post("/update-points", protect, restrictTo("admin"), async (req: Request, res: Response): Promise<void> => {
  const { userId, points } = req.body;

  if (!userId || !points) {
    // Handle missing data
    res.status(400).json({ message: "User ID and points are required." });
    return;  // Just return to avoid TypeScript error
  }

  try {
    // Assuming the updateLeaderboard function is already implemented in your LeaderboardController
    await updateLeaderboard(userId);
    res.status(200).json({ message: "Leaderboard updated successfully." });
  } catch (error) {
    logger.error(`Error updating leaderboard: ${(error as Error).message}`);
    res.status(500).json({ message: "Failed to update leaderboard." });
  }
});

export default router;
