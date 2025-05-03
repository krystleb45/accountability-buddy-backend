// src/api/routes/groupRoutes.ts
import { Router, Request, Response, NextFunction } from "express";
import { check } from "express-validator";
import sanitize from "mongo-sanitize";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import checkSubscription from "../middleware/checkSubscription";
import * as groupController from "../controllers/groupController";
import handleValidationErrors from "../middleware/handleValidationErrors";
import { logger } from "../../utils/winstonLogger";

const router = Router();
const groupLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, message: "Too many requests" });

// POST /api/groups/create
router.post(
  "/create",
  protect,
  checkSubscription("paid"),
  groupLimiter,
  [
    check("name", "Group name is required").notEmpty(),
    check("name", "Must be ≤100 chars").isLength({ max: 100 }),
    check("interests", "Interests must be an array").isArray(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = sanitize(req.body);
      const group = await groupController.createGroup(req.user!.id, body.name, body.interests);
      res.status(201).json({ success: true, group });
    } catch (err) {
      logger.error("Error creating group", { error: err, userId: req.user?.id });
      next(err);
    }
  }
);

// … other routes: /join, /leave, /my-groups

export default router;
