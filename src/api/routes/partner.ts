// src/api/routes/partner.ts
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import {
  notifyPartner,
  addPartnerNotification,
  getPartnerNotifications,
} from "../controllers/partnerController";

const router = Router();

// ─── Rate limiter ───────────────────────────────────────────────────────────────
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// ─── Validators ─────────────────────────────────────────────────────────────────
const validateNotify = [
  check("partnerId", "Partner ID is required").notEmpty().isMongoId(),
  check("goal",      "Goal title is required").notEmpty(),
  check("milestone","Milestone title is required").notEmpty(),
];

const validateAdd = [
  check("partnerId", "Partner ID is required").notEmpty().isMongoId(),
  check("userId",    "User ID is required").notEmpty().isMongoId(),
];

// ─── Routes ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/partner/notify
 * Notify a partner about a goal milestone
 */
router.post(
  "/notify",
  protect,
  rateLimiter,
  validateNotify,
  handleValidationErrors,
  notifyPartner
);

/**
 * POST /api/partner/add
 * Add a partner and send a notification
 */
router.post(
  "/add",
  protect,
  rateLimiter,
  validateAdd,
  handleValidationErrors,
  addPartnerNotification
);

/**
 * GET /api/partner/notifications
 * Get paginated partner notifications for the current user
 */
router.get(
  "/notifications",
  protect,
  getPartnerNotifications
);

export default router;
