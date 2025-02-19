import type { Request, Response, Router } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose"; // For ObjectId validation
import CollaborationGoal from "../models/CollaborationGoal";
import authMiddleware from "../middleware/authMiddleware";
import catchAsync from "../utils/catchAsync";

const router: Router = express.Router();

// Utility to validate MongoDB ObjectID
const isValidObjectId = (id: string): boolean =>
  mongoose.Types.ObjectId.isValid(id);

// Middleware for validating goal creation inputs
const validateGoalCreation = [
  check("goalTitle", "Goal title is required").notEmpty(),
  check("description", "Description is required").notEmpty(),
  check("participants", "Participants must be an array").isArray(),
  check(
    "target",
    "Target is required and must be a number greater than 0",
  ).isInt({ min: 1 }),
];

// Middleware for progress update validation
const validateProgressUpdate = [
  check("progress", "Progress must be a number").isInt({ min: 0 }),
];

// Rate limiter to prevent abuse
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  message: "Too many requests. Please try again later.",
});

/**
 * @route   POST /create
 * @desc    Create a new collaboration goal
 * @access  Private
 */
router.post(
  "/create",
  rateLimiter,
  authMiddleware,
  validateGoalCreation,
  catchAsync(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { goalTitle, description, participants, target } = req.body;

    // Validate user authentication
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const newGoal = new CollaborationGoal({
      goalTitle,
      description,
      createdBy: new mongoose.Types.ObjectId(userId), // Explicitly set ObjectId
      participants: [
        new mongoose.Types.ObjectId(userId),
        ...participants.map((p: string) => new mongoose.Types.ObjectId(p)),
      ],
      target,
    });

    await newGoal.save();
    res.status(201).json({ success: true, goal: newGoal });
  }),
);

/**
 * @route   PUT /:id/update-progress
 * @desc    Update progress on a collaboration goal
 * @access  Private
 */
router.put(
  "/:id/update-progress",
  rateLimiter,
  authMiddleware,
  validateProgressUpdate,
  catchAsync(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { progress } = req.body;

    // Validate user authentication
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid goal ID" });
      return;
    }

    const goal = await CollaborationGoal.findById(id);

    if (!goal) {
      res.status(404).json({ success: false, message: "Goal not found" });
      return;
    }

    // Ensure only participants or the creator can update progress
    if (
      !goal.participants.some((p) =>
        p.equals(new mongoose.Types.ObjectId(userId)),
      ) &&
      !goal.createdBy.equals(new mongoose.Types.ObjectId(userId))
    ) {
      res
        .status(403)
        .json({ success: false, message: "Not authorized to update this goal" });
      return;
    }

    goal.progress = progress;
    await goal.save();

    res.status(200).json({ success: true, goal });
  }),
);

/**
 * @route   GET /my-goals
 * @desc    Fetch all collaboration goals for the authenticated user
 * @access  Private
 */
router.get(
  "/my-goals",
  rateLimiter,
  authMiddleware,
  catchAsync(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const goals = await CollaborationGoal.find({
      $or: [
        { participants: new mongoose.Types.ObjectId(userId) },
        { createdBy: new mongoose.Types.ObjectId(userId) },
      ],
    }).sort({ createdAt: -1 });

    if (!goals.length) {
      res.status(404).json({ success: false, message: "No collaboration goals found" });
      return;
    }

    res.status(200).json({ success: true, goals });
  }),
);

/**
 * @route   GET /:id
 * @desc    Fetch a specific collaboration goal by ID
 * @access  Private
 */
router.get(
  "/:id",
  rateLimiter,
  authMiddleware,
  catchAsync(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid goal ID" });
      return;
    }

    const goal = await CollaborationGoal.findById(id)
      .populate("participants", "username")
      .populate("createdBy", "username");

    if (!goal) {
      res.status(404).json({ success: false, message: "Goal not found" });
      return;
    }

    // Ensure only participants or the creator can view the goal
    if (
      !goal.participants.some((p) =>
        p.equals(new mongoose.Types.ObjectId(userId)),
      ) &&
      !goal.createdBy.equals(new mongoose.Types.ObjectId(userId))
    ) {
      res.status(403).json({ success: false, message: "Not authorized to view this goal" });
      return;
    }

    res.status(200).json({ success: true, goal });
  }),
);

export default router;
