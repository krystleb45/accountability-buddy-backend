// src/api/routes/tracker.ts
import { Router } from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import * as trackerCtrl from "../controllers/TrackerController";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router = Router();

// GET /api/tracker/ → fetch all trackers
router.get(
  "/",
  protect,
  trackerCtrl.getAllTrackers
);

// POST /api/tracker/ → create a tracker
router.post(
  "/",
  protect,
  [ check("name", "Tracker name is required").notEmpty() ],
  handleValidationErrors,
  trackerCtrl.createTracker
);

// PUT /api/tracker/:id → update a tracker’s progress
router.put(
  "/:id",
  protect,
  [
    check("id", "Invalid tracker id").isMongoId(),
    check("progress", "Progress must be a number").isNumeric(),
  ],
  handleValidationErrors,
  trackerCtrl.updateTracker
);

// DELETE /api/tracker/:id → delete a tracker
router.delete(
  "/:id",
  protect,
  [ check("id", "Invalid tracker id").isMongoId() ],
  handleValidationErrors,
  trackerCtrl.deleteTracker
);

// GET /api/tracker/data → get all raw tracking data
router.get(
  "/data",
  protect,
  trackerCtrl.getTrackingData
);

// POST /api/tracker/add → add a new tracking data entry
router.post(
  "/add",
  protect,
  trackerCtrl.addTrackingData
);

// DELETE /api/tracker/delete/:id → delete a tracking data entry
router.delete(
  "/delete/:id",
  protect,
  [ check("id", "Invalid entry id").isMongoId() ],
  handleValidationErrors,
  trackerCtrl.deleteTrackingData
);

export default router;
