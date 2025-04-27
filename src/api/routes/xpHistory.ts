import type { Router } from "express";
import express from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as xpCtrl from "../controllers/xpHistoryController";

const router: Router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many requests; please try again later." },
});

/**
 * @swagger
 * /api/xp-history:
 *   post:
 *     summary: Record a new XP entry
 *     tags: [XP History]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             required: [xp, reason]
 *             properties:
 *               xp:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: XP entry created
 */
router.post(
  "/",
  protect,
  limiter,
  [
    check("xp", "XP must be a number").isNumeric(),
    check("reason", "Reason is required").notEmpty(),
  ],
  handleValidationErrors,
  xpCtrl.createXpEntry
);

/**
 * @swagger
 * /api/xp-history:
 *   get:
 *     summary: Get my XP history
 *     tags: [XP History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of XP entries for the user
 */
router.get(
  "/",
  protect,
  limiter,
  xpCtrl.getMyXpHistory
);

/**
 * @swagger
 * /api/xp-history/all:
 *   get:
 *     summary: Get all XP history entries (admin only)
 *     tags: [XP History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all XP entries
 */
router.get(
  "/all",
  protect,
  roleBasedAccessControl(["admin"]),
  limiter,
  xpCtrl.getAllXpHistory
);

export default router;
