import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import * as RewardController from "../controllers/RewardController";
import rateLimit from "express-rate-limit";
import { logger } from "../../utils/winstonLogger";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many requests. Please try again later.",
});

/**
 * @swagger
 * tags:
 *   name: Rewards
 *   description: Reward redemption and management
 */

/**
 * @swagger
 * /api/rewards:
 *   get:
 *     summary: Get user rewards
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user rewards
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await RewardController.getUserRewards(req, res, next);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error fetching rewards for user ${req.user?.id}: ${errorMessage}`);
      next(error);
    }
  },
);

/**
 * @swagger
 * /api/rewards/redeem:
 *   post:
 *     summary: Redeem a reward
 *     tags: [Rewards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rewardId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reward redeemed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/redeem",
  protect,
  rateLimiter,
  [check("rewardId").notEmpty().withMessage("Reward ID is required.")],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await RewardController.redeemReward(req, res, next);

      res.status(200).json({
        success: true,
        message: "Reward redeemed successfully.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error redeeming reward for user ${req.user?.id}: ${errorMessage}`);
      next(error);
    }
  },
);

/**
 * @swagger
 * /api/rewards/create:
 *   post:
 *     summary: Create a new reward
 *     tags: [Rewards]
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
 *               - points
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               points:
 *                 type: number
 *     responses:
 *       201:
 *         description: Reward created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */
router.post(
  "/create",
  protect,
  roleBasedAccessControl(["admin"]),
  [
    check("title").notEmpty().withMessage("Title is required."),
    check("description")
      .optional()
      .isString()
      .withMessage("Description must be a string."),
    check("points")
      .isNumeric()
      .withMessage("Points must be a numeric value."),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await RewardController.createReward(req, res, next);

      res.status(201).json({
        success: true,
        message: "Reward created successfully.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error creating reward: ${errorMessage}`);
      next(error);
    }
  },
);

export default router;
