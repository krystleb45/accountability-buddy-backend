/**
 * @swagger
 * tags:
 *   name: Goal Messages
 *   description: Endpoints for sending and retrieving messages related to specific goals
 */

import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import * as goalMessageController from "../controllers/GoalMessageController";
import { protect } from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";
import { logger } from "../../utils/winstonLogger";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many messages sent, please try again later.",
});

/**
 * @swagger
 * /goal-message/{goalId}/send:
 *   post:
 *     summary: Send a message related to a specific goal
 *     tags: [Goal Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the goal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/:goalId/send",
  protect,
  messageLimiter,
  [
    check("message", "Message is required").notEmpty(),
    check("message", "Message must not exceed 500 characters").isLength({
      max: 500,
    }),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { goalId } = req.params;

    if (!goalId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({ success: false, msg: "Invalid goal ID" });
      return;
    }

    try {
      await goalMessageController.sendGoalMessage(req as any, res, next);
      res.status(201).json({ success: true, msg: "Message sent successfully." });
    } catch (error) {
      logger.error(`Error sending goal message: ${(error as Error).message}`, {
        error,
        goalId,
        userId: req.user?.id,
      });
      next(error);
    }
  },
);

/**
 * @swagger
 * /goal-message/{goalId}/messages:
 *   get:
 *     summary: Retrieve all messages related to a specific goal
 *     tags: [Goal Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the goal
 *     responses:
 *       200:
 *         description: List of messages
 *       400:
 *         description: Invalid goal ID
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:goalId/messages",
  protect,
  async (
    req: Request<{ goalId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const { goalId } = req.params;

    if (!goalId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({ success: false, msg: "Invalid goal ID" });
      return;
    }

    try {
      const messages = await goalMessageController.getGoalMessages(req as any, res, next);
      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      logger.error(`Error fetching goal messages: ${(error as Error).message}`, {
        error,
        goalId,
        userId: req.user?.id,
      });
      next(error);
    }
  },
);

export default router;
