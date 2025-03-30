import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware"; // Corrected import to use named export `protect`
import * as MilestoneController from "../controllers/MilestoneController"; // Controller path
import { logger } from "../../utils/winstonLogger";import { check } from "express-validator";
import handleValidationErrors from "../middleware/handleValidationErrors"; // Adjust the path


const router: Router = express.Router();

/**
 * Rate limiter to prevent abuse of milestone-related endpoints.
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 requests per window
  message: "Too many requests. Please try again later.",
});



/**
 * @route   GET /milestones
 * @desc    Get user milestones
 * @access  Private
 */
router.get(
  "/",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id; // Ensure `req.user` is typed properly

      if (!userId) {
        res.status(401).json({ success: false, msg: "Unauthorized" });
        return;
      }

      await MilestoneController.getUserMilestones(req, res, next); // Pass req, res, next
    } catch (error) {
      logger.error(`Error fetching milestones: ${(error as Error).message}`, {
        error,
        userId: (req as any).user?.id,
        ip: req.ip,
      });
      next(error);
    }
  },
);

/**
 * @route   POST /milestones/add
 * @desc    Add a new milestone
 * @access  Private
 */
router.post(
  "/add",
  protect,
  rateLimiter,
  [
    check("title", "Title is required").notEmpty(),
    check("description", "Description must not exceed 500 characters").optional().isLength({ max: 500 }),
    check("dueDate", "Invalid date format").optional().isISO8601(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ success: false, msg: "Unauthorized" });
        return;
      }

      MilestoneController.addMilestone(req, res, next); // Pass req, res, next
    } catch (error) {
      logger.error(`Error adding milestone: ${(error as Error).message}`, {
        error,
        userId: (req as any).user?.id,
        ip: req.ip,
      });
      next(error);
    }
  },
);

/**
 * @route   PUT /milestones/update
 * @desc    Update a milestone
 * @access  Private
 */
router.put(
  "/update",
  protect,
  [
    check("milestoneId", "Milestone ID is required").notEmpty().isMongoId(),
    check("title", "Title must not be empty").optional().notEmpty(),
    check("description", "Description must not exceed 500 characters").optional().isLength({ max: 500 }),
    check("dueDate", "Invalid date format").optional().isISO8601(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ success: false, msg: "Unauthorized" });
        return;
      }

      await MilestoneController.updateMilestone(req, res, next); // Pass req, res, next
    } catch (error) {
      logger.error(`Error updating milestone: ${(error as Error).message}`, {
        error,
        userId: (req as any).user?.id,
        milestoneId: req.body.milestoneId,
        ip: req.ip,
      });
      next(error);
    }
  },
);

/**
 * @route   DELETE /milestones/delete
 * @desc    Delete a milestone
 * @access  Private
 */
router.delete(
  "/delete",
  protect,
  [
    check("milestoneId", "Milestone ID is required").notEmpty().isMongoId(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ success: false, msg: "Unauthorized" });
        return;
      }

      await MilestoneController.deleteMilestone(req, res, next); // Pass req, res, next
    } catch (error) {
      logger.error(`Error deleting milestone: ${(error as Error).message}`, {
        error,
        userId: (req as any).user?.id,
        milestoneId: req.body.milestoneId,
        ip: req.ip,
      });
      next(error);
    }
  },
);

export default router;
