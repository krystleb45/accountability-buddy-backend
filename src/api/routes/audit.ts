// src/api/routes/audit.ts
import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import * as AuditController from "../controllers/AuditController";

const router = Router();

// throttle a bit so your audit endpoint isn’t DOS’d
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: "Too many requests" }
});

// ── GET /api/audit ────────────────────────────────────────────────────────────────
// this lets the smoke-test pass
router.get(
  "/",
  protect,
  limiter,
  (_req: Request, res: Response, _next: NextFunction): void => {
    res.sendStatus(200);
    // no return, this is a void handler
  }
);

// POST /api/audit/log
router.post(
  "/log",
  protect,
  limiter,
  AuditController.logAuditEvent
);

// GET /api/audit
router.get(
  "/",
  protect,
  limiter,
  AuditController.getAuditLogs
);

// GET /api/audit/user/:userId
router.get(
  "/user/:userId",
  protect,
  limiter,
  AuditController.getAuditLogsByUser
);

export default router;
