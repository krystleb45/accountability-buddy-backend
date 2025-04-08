import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as partnerController from "../controllers/partnerController";
import { logger } from "../../utils/winstonLogger";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

/**
 * Rate Limiter to prevent abuse
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

/**
 * Validation for Partner Notifications
 */
const validatePartnerInput = [
  check("partnerId", "Partner ID is required and must be a valid Mongo ID").notEmpty().isMongoId(),
  check("goal", "Goal title is required").notEmpty(),
  check("milestone", "Milestone title is required").notEmpty(),
];

/**
 * Validation for Adding a Partner
 */
const validateAddPartnerInput = [
  check("partnerId", "Partner ID is required and must be a valid Mongo ID").notEmpty().isMongoId(),
  check("userId", "User ID is required and must be a valid Mongo ID").notEmpty().isMongoId(),
];

/**
 * @swagger
 * /api/partner/notify:
 *   post:
 *     summary: Notify a partner about a goal milestone
 *     tags: [Partner Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [partnerId, goal, milestone]
 *             properties:
 *               partnerId:
 *                 type: string
 *               goal:
 *                 type: string
 *               milestone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Partner notified successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/notify",
  protect,
  rateLimiter,
  validatePartnerInput,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await partnerController.notifyPartner(req, res, next);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      logger.error(`Error notifying partner: ${errorMessage}`);
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/partner/add:
 *   post:
 *     summary: Add a partner and send a notification
 *     tags: [Partner Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [partnerId, userId]
 *             properties:
 *               partnerId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Partner added and notified
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/add",
  protect,
  rateLimiter,
  validateAddPartnerInput,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await partnerController.addPartnerNotification(req, res, next);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      logger.error(`Error adding partner: ${errorMessage}`);
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/partner/notifications:
 *   get:
 *     summary: Get all partner notifications for the authenticated user
 *     tags: [Partner Support]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of partner notifications
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/notifications",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await partnerController.getPartnerNotifications(req, res, next);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      logger.error(`Error fetching partner notifications: ${errorMessage}`, {
        userId: req.user?.id,
      });
      next(err);
    }
  },
);

export default router;
