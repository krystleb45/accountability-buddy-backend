// src/api/routes/adminReports.ts
import { Router, Request, Response, NextFunction } from "express";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import * as reportController from "../controllers/ReportController";

const router = Router();
const isAdmin = roleBasedAccessControl(["admin"]);

/**
 * GET /api/admin/reports?page=&limit=
 * List all reports (paginated)
 */
router.get(
  "/",
  protect,
  isAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // parse pagination from query
      const page = parseInt((req.query.page as string) || "1", 10);
      const limit = parseInt((req.query.limit as string) || "10", 10);

      // controller returns an array; we'll implement pagination here
      const allReports = await reportController.getAllReports();
      const total = allReports.length;
      const start = (page - 1) * limit;
      const paged = allReports.slice(start, start + limit);

      res.json({ success: true, reports: paged, total });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/admin/reports/:id
 * Resolve (or otherwise handle) a report
 */
router.post(
  "/:id",
  protect,
  isAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const reportId = req.params.id;
      const { action } = req.body;

      // Only support "resolve" for now
      if (action !== "resolve") {
        res.status(400).json({ success: false, message: "Invalid action" });
        return;                // <- short-circuit, returns void
      }

      const updated = await reportController.resolveReport(reportId, (req.user as any).id);
      if (!updated) {
        res.status(404).json({ success: false, message: "Report not found" });
        return;                // <- short-circuit, returns void
      }

      // Success path
      res.json({ success: true, report: updated });
      return;                  // <- explicit void
    } catch (err) {
      next(err);
      return;                  // <- return after calling next
    }
  }
);

export default router;
