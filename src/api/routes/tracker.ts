import { Router, Request, Response, NextFunction } from "express";
import { check } from "express-validator";
import { protect } from "../middleware/authMiddleware";
import * as trackerCtrl from "../controllers/TrackerController";
import handleValidationErrors from "../middleware/handleValidationErrors";

const router = Router();

// fetch all trackers
router.get(
  "/",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await trackerCtrl.getAllTrackers(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

// create a tracker
router.post(
  "/",
  protect,
  [ check("name", "Tracker name is required").notEmpty() ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await trackerCtrl.createTracker(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

// update a tracker’s progress
router.put(
  "/:id",
  protect,
  [
    check("id", "Invalid tracker id").isMongoId(),
    check("progress", "Progress must be a number").isNumeric(),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await trackerCtrl.updateTracker(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

// delete a tracker
router.delete(
  "/:id",
  protect,
  [ check("id", "Invalid tracker id").isMongoId() ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await trackerCtrl.deleteTracker(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

// get all raw tracking data
router.get(
  "/data",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await trackerCtrl.getTrackingData(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

// add a new tracking data entry
router.post(
  "/add",
  protect,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await trackerCtrl.addTrackingData(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

// delete a tracking data entry
router.delete(
  "/delete/:id",
  protect,
  [ check("id", "Invalid entry id").isMongoId() ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await trackerCtrl.deleteTrackingData(req, res, next);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
