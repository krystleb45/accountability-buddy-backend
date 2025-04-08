import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { protect } from "../middleware/authMiddleware";
import * as HistoryController from "../controllers/HistoryController";
import { logger } from "../../utils/winstonLogger";

const router: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: History
 *   description: User activity and history tracking
 */

/**
 * @swagger
 * /history:
 *   get:
 *     summary: Get user history
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User history retrieved successfully
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Server error
 */
router.get(
  "/",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, msg: "Unauthorized" });
        return;
      }

      await HistoryController.getAllHistory(req, res, next);
    } catch (error) {
      logger.error(`Error fetching user history: ${(error as Error).message}`, {
        error,
        userId: (req as any).user?.id,
        ip: req.ip,
      });
      next(error);
    }
  }
);

/**
 * @swagger
 * /history/clear:
 *   delete:
 *     summary: Clear user history
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History cleared successfully
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Server error
 */
router.delete(
  "/clear",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, msg: "Unauthorized" });
        return;
      }

      await HistoryController.clearHistory(req, res, next);
    } catch (error) {
      logger.error(`Error clearing user history: ${(error as Error).message}`, {
        error,
        userId: (req as any).user?.id,
        ip: req.ip,
      });
      next(error);
    }
  }
);

export default router;
