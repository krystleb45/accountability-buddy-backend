import express, { Router, Request, Response, NextFunction } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import * as BadgeController from "../controllers/BadgeController";
import { protect, restrictTo } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import { logger } from "../../utils/winstonLogger";

const router: Router = express.Router();

const badgeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later.",
});

const badgeOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many requests. Please try again later.",
});

router.use(badgeRateLimiter);

const handleRouteErrors = (
  handler: (req: Request, res: Response, next: NextFunction) => void | Promise<void>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await Promise.resolve(handler(req, res, next));
    } catch (error) {
      logger.error(`Error in badge route: ${(error as Error).message}`);
      next(error);
    }
  };
};

/**
 * @swagger
 * /api/badges:
 *   get:
 *     summary: Get all badges for the logged-in user
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user badges
 */
router.get("/", protect, handleRouteErrors(BadgeController.getUserBadges));

/**
 * @swagger
 * /api/badges/showcase:
 *   get:
 *     summary: Get showcased badges for the logged-in user
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of showcased badges
 */
router.get("/showcase", protect, handleRouteErrors(BadgeController.getUserBadgeShowcase));

/**
 * @swagger
 * /api/badges/award:
 *   post:
 *     summary: Award a badge to a user
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, badgeType]
 *             properties:
 *               userId:
 *                 type: string
 *               badgeType:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: [Bronze, Silver, Gold]
 *     responses:
 *       200:
 *         description: Badge awarded
 */
router.post(
  "/award",
  protect,
  restrictTo("admin"),
  badgeOperationLimiter,
  [
    check("userId").notEmpty().bail().isMongoId(),
    check("badgeType").notEmpty(),
    check("level").optional().isIn(["Bronze", "Silver", "Gold"]),
  ],
  handleValidationErrors,
  handleRouteErrors(BadgeController.awardBadge)
);

/**
 * @swagger
 * /api/badges/progress/update:
 *   post:
 *     summary: Update badge progress
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [badgeType, increment]
 *             properties:
 *               badgeType:
 *                 type: string
 *               increment:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Progress updated
 */
router.post(
  "/progress/update",
  protect,
  badgeOperationLimiter,
  [
    check("badgeType").notEmpty(),
    check("increment").notEmpty().isInt({ min: 1 }),
  ],
  handleValidationErrors,
  handleRouteErrors(BadgeController.updateBadgeProgress)
);

/**
 * @swagger
 * /api/badges/upgrade:
 *   post:
 *     summary: Upgrade badge level
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [badgeType]
 *             properties:
 *               badgeType:
 *                 type: string
 *               userId:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: [Bronze, Silver, Gold]
 *               increment:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Badge upgraded
 */
router.post(
  "/upgrade",
  protect,
  [
    check("userId").optional().isMongoId(),
    check("badgeType").notEmpty(),
    check("level").optional().isIn(["Bronze", "Silver", "Gold"]),
    check("increment").optional().isInt({ min: 1 }),
  ],
  handleValidationErrors,
  handleRouteErrors(BadgeController.upgradeBadgeLevel)
);

/**
 * @swagger
 * /api/badges/expired/remove:
 *   delete:
 *     summary: Remove expired badges (Admin only)
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired badges removed
 */
router.delete(
  "/expired/remove",
  protect,
  restrictTo("admin"),
  handleRouteErrors(BadgeController.removeExpiredBadges)
);

export default router;
