// src/api/routes/setting.ts
import { Router, Request, Response, NextFunction } from "express";
import { check } from "express-validator";
import sanitize from "mongo-sanitize";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as settingsController from "../controllers/SettingsController";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router = Router();

// 10 requests per 15 minutes
const settingsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many settings requests, please try again later.",
});

// sanitize only req.body
const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  req.body = sanitize(req.body);
  next();
};

/** GET /api/settings */
router.get(
  "/",
  protect,
  settingsController.getUserSettings
);

/** PUT /api/settings/update */
router.put(
  "/update",
  protect,
  settingsLimiter,
  sanitizeBody,
  [
    check("emailNotifications").optional().isBoolean(),
    check("smsNotifications").optional().isBoolean(),
    check("theme").optional().isIn(["light", "dark"]),
    check("language").optional().isIn(["en", "es", "fr", "de", "zh"]),
  ],
  handleValidationErrors,
  settingsController.updateUserSettings
);

/** PUT /api/settings/password */
router.put(
  "/password",
  protect,
  settingsLimiter,
  sanitizeBody,
  [
    check("currentPassword", "Current password is required").notEmpty(),
    check("newPassword", "New password must be at least 6 characters").isLength({ min: 6 }),
  ],
  handleValidationErrors,
  settingsController.updateUserPassword
);

/** PUT /api/settings/notifications */
router.put(
  "/notifications",
  protect,
  settingsLimiter,
  sanitizeBody,
  [
    check("emailNotifications").isBoolean(),
    check("smsNotifications").isBoolean(),
    check("pushNotifications").isBoolean(),
  ],
  handleValidationErrors,
  settingsController.updateNotificationPreferences
);

/** DELETE /api/settings/account */
router.delete(
  "/account",
  protect,
  settingsController.deactivateUserAccount
);

export default router;
