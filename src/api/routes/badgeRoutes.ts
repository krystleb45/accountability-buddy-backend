// src/api/routes/badgeRoutes.ts
import { Router } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect, restrictTo } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as BadgeController from "../controllers/BadgeController";

const router = Router();

// Apply a 100‐req/15min limiter to all badge routes
router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: "Too many requests, please try again later." },
  })
);

// GET /api/badges
router.get("/", protect, BadgeController.getUserBadges);

// GET /api/badges/showcase
router.get("/showcase", protect, BadgeController.getUserBadgeShowcase);

// POST /api/badges/award
router.post(
  "/award",
  protect,
  restrictTo("admin"),
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, message: "Too many requests." } }),
  [
    check("userId", "Valid userId is required").isMongoId(),
    check("badgeType", "badgeType is required").notEmpty(),
    check("level").optional().isIn(["Bronze", "Silver", "Gold"]),
  ],
  handleValidationErrors,
  BadgeController.awardBadge
);

// POST /api/badges/progress/update
router.post(
  "/progress/update",
  protect,
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, message: "Too many requests." } }),
  [
    check("badgeType", "badgeType is required").notEmpty(),
    check("increment", "increment must be a positive integer").isInt({ min: 1 }),
  ],
  handleValidationErrors,
  BadgeController.updateBadgeProgress
);

// POST /api/badges/upgrade
router.post(
  "/upgrade",
  protect,
  restrictTo("admin"),
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, message: "Too many requests." } }),
  [
    check("userId", "Valid userId is required").isMongoId(),
    check("badgeType", "badgeType is required").notEmpty(),
    check("level").optional().isIn(["Bronze", "Silver", "Gold"]),
  ],
  handleValidationErrors,
  BadgeController.awardBadge  // reuse awardBadge to “upgrade” level
);

// DELETE /api/badges/expired/remove
router.delete(
  "/expired/remove",
  protect,
  restrictTo("admin"),
  BadgeController.removeExpiredBadges
);

export default router;
