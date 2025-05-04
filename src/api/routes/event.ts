// src/api/routes/events.ts
import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { check, param } from "express-validator";
import mongoose from "mongoose";

import { protect } from "../middleware/authMiddleware";
import handleValidationErrors from "../middleware/handleValidationErrors";
import catchAsync from "../utils/catchAsync";
import Event from "../models/Event";

const router = Router();

// ── Rate limiter ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many requests. Please try again later." },
});

// ── Validation chains ────────────────────────────────────────────────────────
const validateEventIdParam = [
  param("eventId", "Invalid event ID").isMongoId(),
];

const validateEventCreation = [
  check("eventTitle", "Event title is required").notEmpty(),
  check("description", "Description is required").notEmpty(),
  check("date", "A valid date is required").isISO8601(),
  check("participants", "Participants must be an array of user IDs")
    .isArray({ min: 1 }),
  check("participants.*", "Each participant must be a valid Mongo ID")
    .isMongoId(),
  check("location", "Location is required").notEmpty(),
];

const validateProgressUpdate = [
  param("id", "Invalid event ID").isMongoId(),
  check("progress", "Progress must be a number between 0 and 100")
    .isInt({ min: 0, max: 100 }),
];
router.get(
  "/",
  limiter,
  protect,
  catchAsync(async (_req: Request, res: Response) => {
    const events = await Event.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, events });
  })
);
// ── POST /api/events/:eventId/join ──────────────────────────────────────────
router.post(
  "/:eventId/join",
  limiter,
  protect,
  validateEventIdParam,
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { eventId } = req.params;
    const userId      = req.user!.id;
    const userOid     = new mongoose.Types.ObjectId(String(userId));

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: "Event not found" });
      return;
    }

    // Add participant subdoc if not already present
    if (!event.participants.some(p => p.user.equals(userOid))) {
      event.participants.push({ user: userOid });
      await event.save();
    }

    res.status(200).json({ success: true, event });
  })
);

// ── POST /api/events/:eventId/leave ─────────────────────────────────────────
router.post(
  "/:eventId/leave",
  limiter,
  protect,
  validateEventIdParam,
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { eventId } = req.params;
    const userId      = req.user!.id;
    const userOid     = new mongoose.Types.ObjectId(String(userId));

    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ success: false, message: "Event not found" });
      return;
    }

    // Remove any participant subdocs matching this user
    for (let i = event.participants.length - 1; i >= 0; i--) {
      if (event.participants[i].user.equals(userOid)) {
        event.participants.splice(i, 1);
      }
    }
    await event.save();

    res.status(200).json({ success: true, event });
  })
);

// ── POST /api/events/create ─────────────────────────────────────────────────
router.post(
  "/create",
  limiter,
  protect,
  validateEventCreation,
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { eventTitle, description, date, participants, location } = req.body;
    const userId  = req.user!.id;
    const userOid = new mongoose.Types.ObjectId(String(userId));

    // Convert all participant IDs to ObjectId (hex-string overload)
    const participantOids = (participants as string[]).map(id =>
      new mongoose.Types.ObjectId(String(id))
    );

    const newEvent = new Event({
      eventTitle,
      description,
      date: new Date(date),
      createdBy: userOid,
      participants: [userOid, ...participantOids],
      location,
    });

    await newEvent.save();
    res.status(201).json({ success: true, event: newEvent });
  })
);

// ── PUT /api/events/:id/update-progress ────────────────────────────────────
router.put(
  "/:id/update-progress",
  limiter,
  protect,
  validateProgressUpdate,
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id }     = req.params;
    const progress   = parseInt(req.body.progress, 10);
    const userId     = req.user!.id;
    const userOid    = new mongoose.Types.ObjectId(String(userId));

    const event = await Event.findById(id);
    if (!event) {
      res.status(404).json({ success: false, message: "Event not found" });
      return;
    }

    const isParticipant = event.participants.some(p => p.user.equals(userOid));
    const isCreator     = event.createdBy.equals(userOid);
    if (!isParticipant && !isCreator) {
      res.status(403).json({ success: false, message: "Not authorized to update this event" });
      return;
    }

    event.progress = progress;
    await event.save();
    res.status(200).json({ success: true, event });
  })
);

// ── GET /api/events/my-events ──────────────────────────────────────────────
router.get(
  "/my-events",
  limiter,
  protect,
  catchAsync(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const userId   = req.user!.id;
    const userOid  = new mongoose.Types.ObjectId(String(userId));

    const events = await Event.find({
      $or: [
        { "participants.user": userOid },
        { createdBy: userOid },
      ],
    }).sort({ createdAt: -1 });

    if (!events.length) {
      res.status(404).json({ success: false, message: "No events found" });
      return;
    }

    res.status(200).json({ success: true, events });
  })
);

// ── GET /api/events/:id ────────────────────────────────────────────────────
router.get(
  "/:id",
  limiter,
  protect,
  [param("id", "Invalid event ID").isMongoId()],
  handleValidationErrors,
  catchAsync(async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const { id }    = req.params;
    const userId    = req.user!.id;
    const userOid   = new mongoose.Types.ObjectId(String(userId));

    const event = await Event.findById(id)
      .populate("participants.user", "username")   // adjust path if needed
      .populate("createdBy", "username");

    if (!event) {
      res.status(404).json({ success: false, message: "Event not found" });
      return;
    }

    const isParticipant = event.participants.some(p => p.user.equals(userOid));
    const isCreator     = event.createdBy.equals(userOid);
    if (!isParticipant && !isCreator) {
      res.status(403).json({ success: false, message: "Not authorized to view this event" });
      return;
    }

    res.status(200).json({ success: true, event });
  })
);

export default router;
