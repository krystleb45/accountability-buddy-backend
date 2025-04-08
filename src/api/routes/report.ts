import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { check } from "express-validator";
import sanitize from "mongo-sanitize";
import rateLimit from "express-rate-limit";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import * as reportController from "../controllers/ReportController";
import { logger } from "../../utils/winstonLogger";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router: Router = express.Router();

/**
 * Rate limiter to prevent abuse of reporting functionality.
 */
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many reports from this IP, please try again later.",
  },
});

const reportValidation = [
  check("reportedId", "Reported ID is required and must be a valid Mongo ID").notEmpty().isMongoId(),
  check("reportType", "Report type is required and must be one of [post, comment, user]")
    .notEmpty()
    .isIn(["post", "comment", "user"]),
  check("reason", "Reason for reporting is required and must not exceed 300 characters")
    .notEmpty()
    .isLength({ max: 300 }),
];

const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  req.body = sanitize(req.body);
  req.params = sanitize(req.params);
  next();
};

/**
 * @swagger
 * /api/report:
 *   post:
 *     summary: Submit a report against a user, post, or comment
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reportedId
 *               - reportType
 *               - reason
 *             properties:
 *               reportedId:
 *                 type: string
 *                 description: ID of the entity being reported
 *               reportType:
 *                 type: string
 *                 enum: [post, comment, user]
 *               reason:
 *                 type: string
 *                 maxLength: 300
 *     responses:
 *       201:
 *         description: Report submitted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/",
  protect,
  reportLimiter,
  reportValidation,
  sanitizeInput,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    try {
      const { reportedId, reportType, reason } = req.body;
      await reportController.createReport((req.user as { id: string }).id, reportedId, reportType, reason);
      res.status(201).json({ success: true, message: "Report submitted successfully" });
    } catch (error) {
      logger.error(`Error creating report: ${(error as Error).message}`);
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/report:
 *   get:
 *     summary: Get all submitted reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of reports
 *       403:
 *         description: Forbidden
 */
router.get(
  "/",
  protect,
  roleBasedAccessControl(["admin"]),
  async (_req, res, next) => {
    try {
      const reports = await reportController.getAllReports();
      res.status(200).json({ success: true, reports });
    } catch (error) {
      logger.error(`Error fetching reports: ${(error as Error).message}`);
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/report/{id}:
 *   get:
 *     summary: Get a specific report by ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report details
 *       404:
 *         description: Report not found
 */
router.get(
  "/:id",
  protect,
  roleBasedAccessControl(["admin"]),
  async (req, res, next) => {
    try {
      const report = await reportController.getReportById(req.params.id);
      if (!report) {
        res.status(404).json({ success: false, message: "Report not found" });
        return;
      }
      res.status(200).json({ success: true, report });
    } catch (error) {
      logger.error(`Error fetching report: ${(error as Error).message}`);
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/report/{id}/resolve:
 *   put:
 *     summary: Mark a report as resolved
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report resolved
 *       404:
 *         description: Report not found
 */
router.put(
  "/:id/resolve",
  protect,
  roleBasedAccessControl(["admin"]),
  async (req, res, next) => {
    try {
      const resolved = await reportController.resolveReport(req.params.id, (req.user as { id: string }).id);
      if (!resolved) {
        res.status(404).json({ success: false, message: "Report not found" });
        return;
      }
      res.status(200).json({ success: true, message: "Report resolved successfully" });
    } catch (error) {
      logger.error(`Error resolving report: ${(error as Error).message}`);
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/report/{id}:
 *   delete:
 *     summary: Delete a report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report deleted
 *       404:
 *         description: Report not found
 */
router.delete(
  "/:id",
  protect,
  roleBasedAccessControl(["admin"]),
  async (req, res, next) => {
    try {
      const deleted = await reportController.deleteReport(req.params.id);
      if (!deleted) {
        res.status(404).json({ success: false, message: "Report not found" });
        return;
      }
      res.status(200).json({ success: true, message: "Report deleted successfully" });
    } catch (error) {
      logger.error(`Error deleting report: ${(error as Error).message}`);
      next(error);
    }
  }
);

export default router;
