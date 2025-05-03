// src/api/routes/history.ts
import { Router, Request, Response, NextFunction } from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import historyController from "../controllers/HistoryController";

const router = Router();

// throttle to 20 requests per minute
const historyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many requests, please try again later." },
});

/**
 * GET /api/history
 * Get all history records for the current user
 */
router.get(
  "/",
  protect,
  historyLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await historyController.getAllHistory(req, res, next);
  }
);

/**
 * GET /api/history/:id
 * Get a single history record by ID
 */
router.get(
  "/:id",
  protect,
  historyLimiter,
  check("id", "Invalid history ID").isMongoId(),
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await historyController.getHistoryById(req, res, next);
  }
);

/**
 * POST /api/history
 * Create a new history record
 */
router.post(
  "/",
  protect,
  historyLimiter,
  check("entity", "Entity is required").notEmpty(),
  check("action", "Action is required").notEmpty(),
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await historyController.createHistory(req, res, next);
  }
);

/**
 * DELETE /api/history/:id
 * Delete a single history record by ID
 */
router.delete(
  "/:id",
  protect,
  historyLimiter,
  check("id", "Invalid history ID").isMongoId(),
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await historyController.deleteHistoryById(req, res, next);
  }
);

/**
 * DELETE /api/history/clear
 * Clear all history records for the current user
 */
router.delete(
  "/clear",
  protect,
  historyLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await historyController.clearHistory(req, res, next);
  }
);

export default router;
