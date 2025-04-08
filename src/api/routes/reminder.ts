import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import checkSubscription from "../middleware/checkSubscription";
import { validateReminder } from "../../validators/reminderValidation";
import * as customReminderController from "../controllers/customReminderController";
import { logger } from "../../utils/winstonLogger";
import type { ParsedQs } from "qs";

const router: Router = express.Router();

/**
 * Rate limiter to prevent abuse of reminder functionality.
 */
const reminderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many reminder requests from this IP, please try again later.",
  },
});

/**
 * @swagger
 * /api/reminders/create:
 *   post:
 *     summary: Create a custom reminder
 *     tags: [Reminders]
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
 *               - frequency
 *               - time
 *             properties:
 *               title:
 *                 type: string
 *               frequency:
 *                 type: string
 *                 example: daily
 *               time:
 *                 type: string
 *                 format: time
 *     responses:
 *       201:
 *         description: Reminder created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/create",
  protect,
  checkSubscription("paid"),
  reminderLimiter,
  validateReminder,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await customReminderController.createReminder(req, res, next);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error creating custom reminder for user ${req.user?.id}: ${errorMessage}`);
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/reminders/user:
 *   get:
 *     summary: Get all reminders for the authenticated user
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of reminders returned
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/user",
  protect,
  checkSubscription("trial"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await customReminderController.getUserReminders(req, res, next);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(`Error fetching reminders for user ${req.user?.id}: ${errorMessage}`);
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/reminders/disable/{reminderId}:
 *   put:
 *     summary: Disable a specific reminder
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reminderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the reminder to disable
 *     responses:
 *       200:
 *         description: Reminder disabled
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put(
  "/disable/:reminderId",
  protect,
  checkSubscription("paid"),
  async (req: Request<{ reminderId: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await customReminderController.disableReminder(req, res, next);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(
        `Error disabling reminder ${req.params.reminderId} for user ${req.user?.id}: ${errorMessage}`
      );
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/reminders/edit/{reminderId}:
 *   put:
 *     summary: Edit an existing reminder
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reminderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Reminder ID to edit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               frequency:
 *                 type: string
 *               time:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reminder updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put(
  "/edit/:reminderId",
  protect,
  checkSubscription("paid"),
  validateReminder,
  async (req: Request<{ reminderId: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await customReminderController.editReminder(req, res, next);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(
        `Error editing reminder ${req.params.reminderId} for user ${req.user?.id}: ${errorMessage}`
      );
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/reminders/delete/{reminderId}:
 *   delete:
 *     summary: Delete a reminder by ID
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reminderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Reminder ID to delete
 *     responses:
 *       200:
 *         description: Reminder deleted
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/delete/:reminderId",
  protect,
  checkSubscription("paid"),
  async (
    req: Request<{ reminderId: string }, any, any, ParsedQs, Record<string, any>>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await customReminderController.deleteReminder(req, res, next);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      logger.error(
        `Error deleting reminder ${req.params.reminderId} for user ${req.user?.id}: ${errorMessage}`
      );
      next(error);
    }
  }
);

export default router;
