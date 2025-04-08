import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as AchievementController from "../controllers/AchievementController";
import mongoose from "mongoose";

const router: Router = express.Router();

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

const validateBody =
  (fields: string[]) =>
    (req: Request, res: Response, next: NextFunction): void => {
      const missingFields = fields.filter((field) => !req.body[field]);
      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
        return;
      }
      next();
    };

/**
 * @swagger
 * tags:
 *   name: Achievements
 *   description: Achievement management endpoints
 */

/**
 * @swagger
 * /api/achievements:
 *   get:
 *     summary: Get all achievements for a user
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of achievements
 *       401:
 *         description: Unauthorized
 */
router.get("/", protect, async (req, res, next) => {
  try {
    await AchievementController.getAllAchievements(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/achievements/add:
 *   post:
 *     summary: Add a new achievement
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - requirements
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               requirements:
 *                 type: string
 *     responses:
 *       201:
 *         description: Achievement created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/add",
  protect,
  rateLimiter,
  validateBody(["name", "description", "requirements"]),
  async (req, res, next) => {
    try {
      await AchievementController.addAchievement(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/achievements/{id}:
 *   delete:
 *     summary: Delete an achievement by ID
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Achievement ID
 *     responses:
 *       200:
 *         description: Achievement deleted
 *       400:
 *         description: Invalid ID
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid achievement ID format.",
      });
      return;
    }
    await AchievementController.deleteAchievement(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/achievements/leaderboard:
 *   get:
 *     summary: Get leaderboard achievements (admin only)
 *     tags: [Achievements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Leaderboard achievements
 *       401:
 *         description: Unauthorized
 */
router.get("/leaderboard", protect, async (req, res, next) => {
  try {
    await AchievementController.getLeaderboardAchievements(req, res, next);
  } catch (error) {
    next(error);
  }
});

export default router;
