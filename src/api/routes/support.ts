// src/api/routes/support.ts
import type { Router } from "express";
import { Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import sanitize from "mongo-sanitize";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as supportController from "../controllers/supportController";

const router: Router = express.Router();

// throttle all support endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many requests; please try again later." },
});

// sanitize body helper
const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  req.body = sanitize(req.body);
  next();
};

/**
 * POST /api/support/contact
 * Public: submit a support request
 */
router.post(
  "/contact",
  limiter,
  [
    check("name", "Name is required").notEmpty(),
    check("email", "Valid email is required").isEmail(),
    check("subject", "Subject is required").notEmpty(),
    check("message", "Message is required").notEmpty(),
    check("priority").optional().isIn(["low", "normal", "high"]),
  ],
  handleValidationErrors,
  sanitizeBody,
  supportController.contactSupport
);

/**
 * GET /api/support/tickets
 * Admin only: list all tickets
 */
router.get(
  "/tickets",
  protect,
  roleBasedAccessControl(["admin"]),
  limiter,
  supportController.getSupportTickets
);

/**
 * GET /api/support/tickets/:ticketId
 * Admin only: get single ticket
 */
router.get(
  "/tickets/:ticketId",
  protect,
  roleBasedAccessControl(["admin"]),
  limiter,
  supportController.getTicketDetails
);

/**
 * PUT /api/support/tickets/:ticketId
 * Admin only: update a ticket
 */
router.put(
  "/tickets/:ticketId",
  protect,
  roleBasedAccessControl(["admin"]),
  limiter,
  sanitizeBody,
  supportController.updateSupportTicket
);

export default router;
