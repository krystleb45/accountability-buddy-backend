import type { IEvent } from "../models/Event";
import Event from "../models/Event";
import { CustomError } from "./errorHandler";
import LoggingService from "./LoggingService";

interface EventFilters {
  [key: string]: unknown;
}

const EventService = {
  /**
   * Create a new event
   * @param eventData - Event data from request body
   * @returns The created event
   */
  createEvent: async (eventData: Record<string, unknown>): Promise<IEvent> => {
    try {
      const event = new Event(eventData);
      await event.save();

      LoggingService.logInfo(`Event created: ${event._id} - ${event.title}`);
      return event;
    } catch (error: unknown) {
      return handleError("creating event", error);
    }
  },

  /**
   * Get event by ID
   */
  getEventById: async (eventId: string): Promise<IEvent> => {
    try {
      const event = await Event.findById(eventId);

      if (!event) {
        throw new CustomError("Event not found", 404);
      }

      LoggingService.logInfo(`Event retrieved: ${event._id} - ${event.title}`);
      return event;
    } catch (error: unknown) {
      return handleError(`retrieving event: ${eventId}`, error);
    }
  },

  /**
   * Get all events with optional filters and pagination
   */
  getAllEvents: async (
    filters: EventFilters = {},
    page = 1,
    limit = 10,
  ): Promise<{ events: IEvent[]; totalPages: number; currentPage: number }> => {
    try {
      const events = await Event.find(filters)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ startDate: 1 });

      const totalEvents = await Event.countDocuments(filters);

      LoggingService.logInfo("Events retrieved with filters", {
        filters,
        page,
        limit,
      });
      return {
        events,
        totalPages: Math.ceil(totalEvents / limit),
        currentPage: page,
      };
    } catch (error: unknown) {
      return handleError("retrieving events", error);
    }
  },

  /**
   * Update an event by ID
   */
  updateEvent: async (
    eventId: string,
    updateData: Record<string, unknown>,
  ): Promise<IEvent> => {
    try {
      const event = await Event.findByIdAndUpdate(eventId, updateData, {
        new: true,
      });

      if (!event) {
        throw new CustomError("Event not found", 404);
      }

      LoggingService.logInfo(`Event updated: ${event._id} - ${event.title}`);
      return event;
    } catch (error: unknown) {
      return handleError(`updating event: ${eventId}`, error);
    }
  },

  /**
   * Delete an event by ID
   */
  deleteEvent: async (eventId: string): Promise<{ message: string }> => {
    try {
      const event = await Event.findByIdAndDelete(eventId);

      if (!event) {
        throw new CustomError("Event not found", 404);
      }

      LoggingService.logInfo(`Event deleted: ${event._id} - ${event.title}`);
      return { message: "Event successfully deleted" };
    } catch (error: unknown) {
      return handleError(`deleting event: ${eventId}`, error);
    }
  },
};

/**
 * Helper to handle errors consistently across EventService methods.
 * Logs the error and throws a CustomError.
 * @param action - The action being performed (e.g., 'creating', 'retrieving')
 * @param error - The error object
 */
function handleError(action: string, error: unknown): never {
  const errorInstance =
    error instanceof Error ? error : new Error(String(error));

  LoggingService.logError(`Error ${action}`, errorInstance, {
    name: errorInstance.name,
    stack: errorInstance.stack || "No stack trace",
    message: errorInstance.message,
  });

  throw new CustomError(`Failed to ${action}`, 500, {
    name: errorInstance.name,
    message: errorInstance.message,
    stack: errorInstance.stack,
  });
}

export default EventService;
