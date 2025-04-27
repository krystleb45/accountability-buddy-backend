// src/api/routes/history.ts
import { Router } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import * as historyController from "../controllers/HistoryController";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router = Router();

// Optional rate-limiter for history endpoints
const historyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { success: false, message: "Too many requests, please try again later." },
});

/**
 * @swagger
 * tags:
 *   name: History
 *   description: User activity history records
 */

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Get all history records for the current user
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History records retrieved
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  protect,
  historyLimiter,
  historyController.getAllHistory
);

/**
 * @swagger
 * /api/history/{id}:
 *   get:
 *     summary: Get a single history record by ID
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *     responses:
 *       200:
 *         description: History record retrieved
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Not found
 */
router.get(
  "/:id",
  protect,
  historyLimiter,
  [ check("id", "Invalid history ID").isMongoId(), handleValidationErrors ],
  historyController.getHistoryById
);

/**
 * @swagger
 * /api/history:
 *   post:
 *     summary: Create a new history record
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [entity, action]
 *             properties:
 *               entity:
 *                 type: string
 *               action:
 *                 type: string
 *               details:
 *                 type: string
 *     responses:
 *       201:
 *         description: History record created
 *       400:
 *         description: Validation error
 */
router.post(
  "/",
  protect,
  historyLimiter,
  [
    check("entity", "Entity is required").notEmpty(),
    check("action", "Action is required").notEmpty(),
    handleValidationErrors,
  ],
  historyController.createHistory
);

/**
 * @swagger
 * /api/history/{id}:
 *   delete:
 *     summary: Delete a single history record by ID
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *     responses:
 *       200:
 *         description: History record deleted
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Not found
 */
router.delete(
  "/:id",
  protect,
  historyLimiter,
  [ check("id", "Invalid history ID").isMongoId(), handleValidationErrors ],
  historyController.deleteHistoryById
);

/**
 * @swagger
 * /api/history/clear:
 *   delete:
 *     summary: Clear all history records for the current user
 *     tags: [History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All history cleared
 *       401:
 *         description: Unauthorized
 */
router.delete(
  "/clear",
  protect,
  historyLimiter,
  historyController.clearHistory
);

export default router;
