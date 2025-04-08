import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as MilestoneController from "../controllers/MilestoneController";
import { logger } from "../../utils/winstonLogger";
import { check } from "express-validator";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Milestones
 *   description: Goal milestone tracking and management
 */

/**
 * Rate limiter to prevent abuse of milestone-related endpoints.
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many requests. Please try again later.",
});

/**
 * @swagger
 * /milestones:
 *   get:
 *     summary: Get all milestones for the authenticated user
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of milestones
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/", protect, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, msg: "Unauthorized" });
      return;
    }
    await MilestoneController.getUserMilestones(req, res, next);
  } catch (error) {
    logger.error(`Error fetching milestones: ${(error as Error).message}`, {
      error,
      userId: (req as any).user?.id,
      ip: req.ip,
    });
    next(error);
  }
});

/**
 * @swagger
 * /milestones/add:
 *   post:
 *     summary: Add a new milestone
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Milestone added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
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
    
      await MilestoneController.addMilestone(req, res, next); // ✅ Now correctly awaited
    } catch (error) {
      logger.error(`Error adding milestone: ${(error as Error).message}`, {
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
 * /milestones/update:
 *   put:
 *     summary: Update an existing milestone
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - milestoneId
 *             properties:
 *               milestoneId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Milestone updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
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
    const userId = (req as any).user?.id; // ✅ Declare this before try-catch

    try {
      if (!userId) {
        res.status(401).json({ success: false, msg: "Unauthorized" });
        return;
      }

      await MilestoneController.updateMilestone(req, res, next);
    } catch (error) {
      logger.error(`Error updating milestone: ${(error as Error).message}`, {
        error,
        userId,
        milestoneId: req.body.milestoneId,
        ip: req.ip,
      });
      next(error);
    }
  },
);


/**
 * @swagger
 * /milestones/delete:
 *   delete:
 *     summary: Delete a milestone
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - milestoneId
 *             properties:
 *               milestoneId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Milestone deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete(
  "/delete",
  protect,
  [check("milestoneId", "Milestone ID is required").notEmpty().isMongoId()],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req as any).user?.id; // ✅ Move declaration here

    try {
      if (!userId) {
        res.status(401).json({ success: false, msg: "Unauthorized" });
        return;
      }

      await MilestoneController.deleteMilestone(req, res, next);
    } catch (error) {
      logger.error(`Error deleting milestone: ${(error as Error).message}`, {
        error,
        userId, // ✅ Now available here
        milestoneId: req.body.milestoneId,
        ip: req.ip,
      });
      next(error);
    }
  }
);

export default router;
