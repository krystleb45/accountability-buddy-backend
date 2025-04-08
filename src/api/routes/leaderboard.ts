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
 * @swagger
 * tags:
 *   name: Leaderboard
 *   description: Leaderboard tracking and stats
 */

/**
 * @swagger
 * /leaderboard:
 *   get:
 *     summary: Get the leaderboard (paginated and cached)
 *     tags: [Leaderboard]
 *     responses:
 *       200:
 *         description: Leaderboard fetched successfully
 *       500:
 *         description: Server error
 */
router.get("/", getLeaderboard);

/**
 * @swagger
 * /leaderboard/user-position:
 *   get:
 *     summary: Get the current user's position on the leaderboard
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User leaderboard position retrieved
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/user-position", protect, getUserLeaderboardPosition);

/**
 * @swagger
 * /leaderboard/reset:
 *   delete:
 *     summary: Reset the leaderboard (Admin only)
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leaderboard reset successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.delete("/reset", protect, restrictTo("admin"), resetLeaderboard);

/**
 * @swagger
 * /leaderboard/update-points:
 *   post:
 *     summary: Trigger an update to a user's leaderboard points (Admin only)
 *     tags: [Leaderboard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 6418fdfb5f9a9b91a3f9dc14
 *     responses:
 *       200:
 *         description: Leaderboard updated successfully
 *       400:
 *         description: Missing or invalid userId
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
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
