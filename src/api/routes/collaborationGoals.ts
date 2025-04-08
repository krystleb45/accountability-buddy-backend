import type { Request, Response, Router } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import CollaborationGoal from "../models/CollaborationGoal";
import { protect } from "../middleware/authMiddleware";
import catchAsync from "../utils/catchAsync";

const router: Router = express.Router();

const isValidObjectId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

const validateGoalCreation = [
  check("goalTitle", "Goal title is required").notEmpty(),
  check("description", "Description is required").notEmpty(),
  check("participants", "Participants must be an array").isArray(),
  check("target", "Target is required and must be a number greater than 0").isInt({ min: 1 }),
];

const validateProgressUpdate = [
  check("progress", "Progress must be a number").isInt({ min: 0 }),
];

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many requests. Please try again later.",
});

/**
 * @swagger
 * /api/collaboration/create:
 *   post:
 *     summary: Create a new collaboration goal
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [goalTitle, description, participants, target]
 *             properties:
 *               goalTitle:
 *                 type: string
 *               description:
 *                 type: string
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *               target:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Goal created
 *       400:
 *         description: Validation failed
 */
router.post(
  "/create",
  rateLimiter,
  protect,
  validateGoalCreation,
  catchAsync(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { goalTitle, description, participants, target } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const newGoal = new CollaborationGoal({
      goalTitle,
      description,
      createdBy: new mongoose.Types.ObjectId(userId),
      participants: [
        new mongoose.Types.ObjectId(userId),
        ...participants.map((p: string) => new mongoose.Types.ObjectId(p)),
      ],
      target,
    });

    await newGoal.save();
    res.status(201).json({ success: true, goal: newGoal });
  })
);

/**
 * @swagger
 * /api/collaboration/{id}/update-progress:
 *   put:
 *     summary: Update progress on a collaboration goal
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Goal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [progress]
 *             properties:
 *               progress:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Progress updated
 *       403:
 *         description: Unauthorized
 */
router.put(
  "/:id/update-progress",
  rateLimiter,
  protect,
  validateProgressUpdate,
  catchAsync(async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { progress } = req.body;
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

    if (
      !goal.participants.some((p) => p.equals(new mongoose.Types.ObjectId(userId))) &&
      !goal.createdBy.equals(new mongoose.Types.ObjectId(userId))
    ) {
      res.status(403).json({ success: false, message: "Not authorized to update this goal" });
      return;
    }

    goal.progress = progress;
    await goal.save();

    res.status(200).json({ success: true, goal });
  })
);

/**
 * @swagger
 * /api/collaboration/my-goals:
 *   get:
 *     summary: Get all collaboration goals for the logged-in user
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of collaboration goals
 *       404:
 *         description: No goals found
 */
router.get(
  "/my-goals",
  rateLimiter,
  protect,
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
  })
);

/**
 * @swagger
 * /api/collaboration/{id}:
 *   get:
 *     summary: Get a specific collaboration goal by ID
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Goal details
 *       403:
 *         description: Not authorized to view this goal
 */
router.get(
  "/:id",
  rateLimiter,
  protect,
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

    if (
      !goal.participants.some((p) => p.equals(new mongoose.Types.ObjectId(userId))) &&
      !goal.createdBy.equals(new mongoose.Types.ObjectId(userId))
    ) {
      res.status(403).json({ success: false, message: "Not authorized to view this goal" });
      return;
    }

    res.status(200).json({ success: true, goal });
  })
);

export default router;
