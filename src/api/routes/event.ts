// src/api/routes/events.ts
import type { Router, Request, Response } from "express";
import express from "express";
import { check, validationResult } from "express-validator";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import Event from "../models/Event";
import { protect } from "../middleware/authMiddleware";
import * as eventController from "../controllers/EventController";

const router: Router = express.Router();

const isValidObjectId = (id: string): boolean =>
  mongoose.Types.ObjectId.isValid(id);

const validateEventCreation = [
  check("eventTitle", "Event title is required").notEmpty(),
  check("description", "Description is required").notEmpty(),
  check("date", "A valid date is required").isISO8601(),
  check("participants", "Participants must be an array").isArray(),
  check("location", "Location is required").notEmpty(),
];

const validateEventProgress = [
  check("progress", "Progress must be a number between 0 and 100").isInt({ min: 0, max: 100 }),
];

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many requests. Please try again later.",
});

// ─── Join an Event ────────────────────────────────────────────────────────────
router.post("/:eventId/join", protect, eventController.joinEvent);

// ─── Leave an Event ───────────────────────────────────────────────────────────
router.post("/:eventId/leave", protect, eventController.leaveEvent);

/**
 * @swagger
 * /api/events/create:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventTitle
 *               - description
 *               - date
 *               - participants
 *               - location
 *             properties:
 *               eventTitle:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Event created
 */
router.post(
  "/create",
  rateLimiter,
  protect,
  validateEventCreation,
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { eventTitle, description, date, participants, location } = req.body;
    const userId = req.user?.id;

    const newEvent = new Event({
      eventTitle,
      description,
      date,
      createdBy: new mongoose.Types.ObjectId(userId),
      participants: [
        new mongoose.Types.ObjectId(userId),
        ...participants.map((p: string) => new mongoose.Types.ObjectId(p)),
      ],
      location,
    });

    await newEvent.save();
    res.status(201).json({ success: true, event: newEvent });
  }
);

/**
 * @swagger
 * /api/events/{id}/update-progress:
 *   put:
 *     summary: Update progress for an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The event ID
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
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Progress updated
 */
router.put(
  "/:id/update-progress",
  rateLimiter,
  protect,
  validateEventProgress,
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { progress } = req.body;
    const userId = req.user?.id;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid event ID" });
      return;
    }

    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ success: false, message: "Event not found" });
      return;
    }

    const isAuthorized =
      event.participants.some((p) => p.user.toString() === userId) ||
      event.createdBy.equals(new mongoose.Types.ObjectId(userId));

    if (!isAuthorized) {
      res.status(403).json({ success: false, message: "Not authorized to update this event" });
      return;
    }

    event.progress = progress;
    await event.save();

    res.status(200).json({ success: true, event });
  }
);

/**
 * @swagger
 * /api/events/my-events:
 *   get:
 *     summary: Get events for authenticated user
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of events
 */
router.get(
  "/my-events",
  rateLimiter,
  protect,
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    const events = await Event.find({
      $or: [
        { participants: new mongoose.Types.ObjectId(userId) },
        { createdBy: new mongoose.Types.ObjectId(userId) },
      ],
    }).sort({ createdAt: -1 });

    if (!events.length) {
      res.status(404).json({ success: false, message: "No events found" });
      return;
    }

    res.status(200).json({ success: true, events });
  }
);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
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
 *         description: Event retrieved
 */
router.get(
  "/:id",
  rateLimiter,
  protect,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid event ID" });
      return;
    }

    const event = await Event.findById(id)
      .populate("participants", "username")
      .populate("createdBy", "username");

    if (!event) {
      res.status(404).json({ success: false, message: "Event not found" });
      return;
    }

    const isAuthorized =
      event.participants.some((p) => p.user.toString() === userId) ||
      event.createdBy.equals(new mongoose.Types.ObjectId(userId));

    if (!isAuthorized) {
      res.status(403).json({ success: false, message: "Not authorized to view this event" });
      return;
    }

    res.status(200).json({ success: true, event });
  }
);

export default router;
