// src/api/routes/collaborationGoals.ts
import { Router, Request, Response, NextFunction } from "express";
import { protect } from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";
import { check, param } from "express-validator";
import handleValidationErrors from "../middleware/handleValidationErrors";
import catchAsync from "../utils/catchAsync";
import CollaborationGoal from "../models/CollaborationGoal";
import mongoose from "mongoose";

const router = Router();

// Rate-limit all collaboration routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// Validation chains
const validateGoalCreation = [
  check("goalTitle", "Goal title is required").notEmpty(),
  check("description", "Description is required").notEmpty(),
  check("participants", "Participants must be an array of user IDs")
    .isArray({ min: 1 }),
  check("participants.*", "Each participant must be a valid Mongo ID")
    .isMongoId(),
  check("target", "Target must be a positive integer")
    .isInt({ min: 1 }),
];

const validateProgressUpdate = [
  param("id", "Invalid goal ID").isMongoId(),
  check("progress", "Progress must be a non-negative integer")
    .isInt({ min: 0 }),
];

/**
 * POST /api/collaboration/create
 */
router.post(
  "/create",
  limiter,
  protect,
  validateGoalCreation,
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { goalTitle, description, participants, target } = req.body;
    const userId = req.user?.id!;
    // Force string conversion so TS picks the hexString overload
    const userObjectId = new mongoose.Types.ObjectId(String(userId));
    const participantIds = (participants as string[]).map(p =>
      new mongoose.Types.ObjectId(String(p))
    );

    const newGoal = new CollaborationGoal({
      goalTitle,
      description,
      createdBy: userObjectId,
      participants: [userObjectId, ...participantIds],
      target,
    });

    await newGoal.save();
    res.status(201).json({ success: true, goal: newGoal });
  })
);

/**
 * PUT /api/collaboration/:id/update-progress
 */
router.put(
  "/:id/update-progress",
  limiter,
  protect,
  validateProgressUpdate,
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const goalId = req.params.id;
    const progress = parseInt(req.body.progress, 10);
    const userId = req.user?.id!;
    const userObjectId = new mongoose.Types.ObjectId(String(userId));

    const goal = await CollaborationGoal.findById(goalId);
    if (!goal) {
      res.status(404).json({ success: false, message: "Goal not found" });
      return;
    }

    const isParticipant = goal.participants.some(p => p.equals(userObjectId));
    const isCreator = goal.createdBy.equals(userObjectId);
    if (!isParticipant && !isCreator) {
      res.status(403).json({ success: false, message: "Not authorized" });
      return;
    }

    goal.progress = progress;
    await goal.save();
    res.status(200).json({ success: true, goal });
  })
);

/**
 * GET /api/collaboration/my-goals
 */
router.get(
  "/my-goals",
  limiter,
  protect,
  catchAsync(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId = req.user?.id!;
    const userObjectId = new mongoose.Types.ObjectId(String(userId));

    const goals = await CollaborationGoal.find({
      $or: [
        { participants: userObjectId },
        { createdBy: userObjectId },
      ],
    }).sort({ createdAt: -1 });

    if (!goals.length) {
      res.status(404).json({ success: false, message: "No collaboration goals found" });
      return;
    }

    res.status(200).json({ success: true, goals });
  })
);

/**
 * GET /api/collaboration/:id
 */
router.get(
  "/:id",
  limiter,
  protect,
  [param("id", "Invalid goal ID").isMongoId()],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const goalId = req.params.id;
    const userId = req.user?.id!;
    const userObjectId = new mongoose.Types.ObjectId(String(userId));

    const goal = await CollaborationGoal.findById(goalId)
      .populate("participants", "username")
      .populate("createdBy", "username");

    if (!goal) {
      res.status(404).json({ success: false, message: "Goal not found" });
      return;
    }

    const isParticipant = goal.participants.some(p => p.equals(userObjectId));
    const isCreator = goal.createdBy.equals(userObjectId);
    if (!isParticipant && !isCreator) {
      res.status(403).json({ success: false, message: "Not authorized" });
      return;
    }

    res.status(200).json({ success: true, goal });
  })
);

export default router;
