import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import sanitize from "mongo-sanitize";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as settingsController from "../controllers/SettingsController";
import { logger } from "../../utils/winstonLogger";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

const settingsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many settings update requests from this IP, please try again later.",
});

const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    req.body = sanitize(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get the current user's settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User settings retrieved
 */
router.get("/", protect, async (req, res, next) => {
  try {
    await settingsController.getUserSettings(req, res, next);
  } catch (error) {
    logger.error(`Error fetching settings: ${(error as Error).message}`);
    next(error);
  }
});

/**
 * @swagger
 * /api/settings/update:
 *   put:
 *     summary: Update user settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailNotifications:
 *                 type: boolean
 *               smsNotifications:
 *                 type: boolean
 *               theme:
 *                 type: string
 *                 enum: [light, dark]
 *               language:
 *                 type: string
 *                 enum: [en, es, fr, de, zh]
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.put(
  "/update",
  protect,
  settingsLimiter,
  sanitizeInput,
  [
    check("emailNotifications").optional().isBoolean(),
    check("smsNotifications").optional().isBoolean(),
    check("theme").optional().isIn(["light", "dark"]),
    check("language").optional().isIn(["en", "es", "fr", "de", "zh"]),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await settingsController.updateUserSettings(req, res, next);
    } catch (error) {
      logger.error(`Error updating settings: ${(error as Error).message}`);
      next(error);
    }
  },
);

/**
 * @swagger
 * /api/settings/password:
 *   put:
 *     summary: Update user password
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 */
router.put(
  "/password",
  protect,
  sanitizeInput,
  [
    check("currentPassword").notEmpty(),
    check("newPassword").isLength({ min: 6 }),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { currentPassword, newPassword } = req.body;
    try {
      await settingsController.updateUserPassword(req, currentPassword, newPassword);
      res.status(200).json({ success: true, msg: "Password updated successfully" });
    } catch (error) {
      logger.error(`Error updating password: ${(error as Error).message}`);
      next(error);
    }
  },
);

/**
 * @swagger
 * /api/settings/notifications:
 *   put:
 *     summary: Update notification preferences
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailNotifications:
 *                 type: boolean
 *               smsNotifications:
 *                 type: boolean
 *               pushNotifications:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Notification preferences updated
 */
router.put(
  "/notifications",
  protect,
  sanitizeInput,
  [
    check("emailNotifications").isBoolean(),
    check("smsNotifications").isBoolean(),
    check("pushNotifications").isBoolean(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await settingsController.updateNotificationPreferences(req, res, next);
    } catch (error) {
      logger.error(`Error updating notification preferences: ${(error as Error).message}`);
      next(error);
    }
  },
);

/**
 * @swagger
 * /api/settings/account:
 *   delete:
 *     summary: Deactivate or delete user account
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deactivated
 */
router.delete(
  "/account",
  protect,
  async (req, res, next) => {
    try {
      await settingsController.deactivateUserAccount(req, res, next);
    } catch (error) {
      logger.error(`Error deactivating account: ${(error as Error).message}`);
      next(error);
    }
  },
);

export default router;