// src/routes/reminders.ts
import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import checkSubscription from "../middleware/checkSubscription";
import { validateReminder } from "../../validators/reminderValidation";
import {
  createCustomReminder,
  getCustomReminders,
  updateCustomReminder,
  disableCustomReminder,
  deleteCustomReminder,
} from "../controllers/ReminderController";
import { logger } from "../../utils/winstonLogger";

const router: Router = express.Router();

const reminderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many reminder requests; please try again later.",
  },
});

router.post(
  "/",
  protect,
  checkSubscription("paid"),
  reminderLimiter,
  validateReminder,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await createCustomReminder(req, res, next);
    } catch (err: any) {
      logger.error(`Failed to create reminder for ${req.user?.id}: ${err.message}`);
      next(err);
    }
  }
);

router.get(
  "/",
  protect,
  checkSubscription("trial"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await getCustomReminders(req, res, next);
    } catch (err: any) {
      logger.error(`Failed to fetch reminders for ${req.user?.id}: ${err.message}`);
      next(err);
    }
  }
);

router.put(
  "/:id",
  protect,
  checkSubscription("paid"),
  validateReminder,
  async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await updateCustomReminder(req, res, next);
    } catch (err: any) {
      logger.error(`Failed to update reminder ${req.params.id}: ${err.message}`);
      next(err);
    }
  }
);

router.put(
  "/disable/:id",
  protect,
  checkSubscription("paid"),
  async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await disableCustomReminder(req, res, next);
    } catch (err: any) {
      logger.error(`Failed to disable reminder ${req.params.id}: ${err.message}`);
      next(err);
    }
  }
);

router.delete(
  "/:id",
  protect,
  checkSubscription("paid"),
  async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      await deleteCustomReminder(req, res, next);
    } catch (err: any) {
      logger.error(`Failed to delete reminder ${req.params.id}: ${err.message}`);
      next(err);
    }
  }
);

export default router;
