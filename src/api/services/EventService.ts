// src/api/services/EventService.ts
import { Types } from "mongoose";
import type { IEvent, IEventParticipant } from "../models/Event";
import Event from "../models/Event";
import { createError } from "../middleware/errorHandler";
import LoggingService from "./LoggingService";

class EventService {
  /** Create a new event */
  static async createEvent(eventData: Partial<IEvent>): Promise<IEvent> {
    try {
      const event = new Event(eventData);
      await event.save();
      void LoggingService.logInfo(`Event created: ${event._id} – ${event.title}`);
      return event;
    } catch (err: unknown) {
      const details =
        err instanceof Error
          ? { name: err.name, message: err.message, stack: err.stack }
          : { value: err };
      void LoggingService.logError("Error creating event", err as Error, details);
      throw createError("Failed to create event", 500, true, details);
    }
  }

  /** Get event by ID */
  static async getEventById(eventId: string): Promise<IEvent> {
    if (!Types.ObjectId.isValid(eventId)) {
      throw createError("Invalid event ID", 400);
    }
    const event = await Event.findById(eventId);
    if (!event) {
      throw createError("Event not found", 404);
    }
    void LoggingService.logInfo(`Event retrieved: ${event._id} – ${event.title}`);
    return event;
  }

  /** User joins an event */
  static async joinEvent(eventId: string, userId: string): Promise<IEvent> {
    if (!Types.ObjectId.isValid(eventId) || !Types.ObjectId.isValid(userId)) {
      throw createError("Invalid ID", 400);
    }
    const event = await Event.findById(eventId);
    if (!event) {
      throw createError("Event not found", 404);
    }
    if (event.participants.some((p) => p.user.toString() === userId)) {
      throw createError("Already attending this event", 400);
    }
    const participant: IEventParticipant = {
      user: new Types.ObjectId(userId),
      joinedAt: new Date(),
      status: "accepted",
    };
    event.participants.push(participant);
    await event.save();
    void LoggingService.logInfo(`User ${userId} joined event ${eventId}`);
    return event;
  }

  /** User leaves an event */
  static async leaveEvent(eventId: string, userId: string): Promise<IEvent> {
    if (!Types.ObjectId.isValid(eventId) || !Types.ObjectId.isValid(userId)) {
      throw createError("Invalid ID", 400);
    }
    const event = await Event.findById(eventId);
    if (!event) {
      throw createError("Event not found", 404);
    }
    if (!event.participants.some((p) => p.user.toString() === userId)) {
      throw createError("Not attending this event", 400);
    }
    event.participants.pull(new Types.ObjectId(userId));
    await event.save();
    void LoggingService.logInfo(`User ${userId} left event ${eventId}`);
    return event;
  }

  /** Delete an event */
  static async deleteEvent(eventId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(eventId)) {
      throw createError("Invalid event ID", 400);
    }
    const event = await Event.findByIdAndDelete(eventId);
    if (!event) {
      throw createError("Event not found", 404);
    }
    void LoggingService.logInfo(`Event deleted: ${event._id} – ${event.title}`);
    return { message: "Event successfully deleted" };
  }
}

export default EventService;
