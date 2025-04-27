import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import rateLimit from "express-rate-limit";
import sanitize from "mongo-sanitize";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import handleValidationErrors from "../middleware/handleValidationErrors";
import * as supportController from "../controllers/supportController";

const router: Router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many requests; please try later." },
});

// middleware to sanitize req.body
function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  req.body = sanitize(req.body);
  next();
}

/**
 * @swagger
 * /support/contact:
 *   post:
 *     summary: Submit a support request
 *     tags: [Support]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             required: [name, email, subject, message]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high]
 *     responses:
 *       201:
 *         description: Ticket created
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
  // call controller as an async handler
  async (req: Request, res: Response, next: NextFunction) => {
    await supportController.contactSupport(req, res, next);
  }
);

/**
 * @swagger
 * /support/tickets:
 *   get:
 *     summary: List all support tickets
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tickets fetched
 */
router.get(
  "/tickets",
  protect,
  roleBasedAccessControl(["admin"]),
  limiter,
  supportController.getSupportTickets
);

/**
 * @swagger
 * /support/tickets/{ticketId}:
 *   get:
 *     summary: Get details of a single ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket details fetched
 */
router.get(
  "/tickets/:ticketId",
  protect,
  roleBasedAccessControl(["admin"]),
  supportController.getTicketDetails
);

/**
 * @swagger
 * /support/tickets/{ticketId}:
 *   put:
 *     summary: Update a support ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, pending, closed]
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high]
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket updated
 */
router.put(
  "/tickets/:ticketId",
  protect,
  roleBasedAccessControl(["admin"]),
  limiter,
  sanitizeBody,
  // async wrapper to await the controller call
  async (req: Request, res: Response, next: NextFunction) => {
    await supportController.updateSupportTicket(req, res, next);
  }
);

export default router;
