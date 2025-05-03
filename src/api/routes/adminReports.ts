// src/api/routes/adminReports.ts
import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import * as ReportController from "../controllers/ReportController";

const router = Router();
const isAdmin = roleBasedAccessControl(["admin"]);

// create (for end users)
router.post("/", protect, ReportController.createReport);

// list
router.get("/", protect, isAdmin, ReportController.getAllReports);

// fetch one
router.get("/:id", protect, isAdmin, ReportController.getReportById);

// resolve
router.post("/:id/resolve", protect, isAdmin, ReportController.resolveReport);

// delete
router.delete("/:id", protect, isAdmin, ReportController.deleteReport);

export default router;
