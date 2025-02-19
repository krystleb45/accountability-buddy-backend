import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import authMiddleware from "../middleware/authMiddleware"; // Corrected middleware import path
import * as HistoryController from "../controllers/HistoryController"; // Corrected controller import path
import logger from "../utils/winstonLogger"; // Added logger utility

const router: Router = express.Router();

/**
 * @route   GET /history
 * @desc    Get user history
 * @access  Private
 */
router.get(
  "/",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Ensure user is authenticated
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, msg: "Unauthorized" });
        return;
      }

      // Forward all required arguments to the controller function
      await HistoryController.getAllHistory(req, res, next); // Pass 'req', 'res', 'next'
    } catch (error) {
      logger.error(`Error fetching user history: ${(error as Error).message}`, {
        error,
        userId: (req as any).user?.id,
        ip: req.ip,
      });
      next(error); // Pass error to middleware
    }
  },
);


/**
 * @route   DELETE /history/clear
 * @desc    Clear user history
 * @access  Private
 */
router.delete(
  "/clear",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id; // Explicitly cast to include `user`

      // Ensure userId exists
      if (!userId) {
        res.status(401).json({ success: false, msg: "Unauthorized" });
        return;
      }

      // Call the controller function with required arguments
      await HistoryController.clearHistory(req, res, next); // Pass 'req', 'res', 'next'
    } catch (error) {
      logger.error(`Error clearing user history: ${(error as Error).message}`, {
        error,
        userId: (req as any).user?.id,
        ip: req.ip,
      });
      next(error); // Forward error to middleware
    }
  },
);


export default router;
