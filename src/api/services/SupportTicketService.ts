// src/api/services/SupportTicketService.ts
import { Types } from "mongoose";
import SupportTicketModel, { ISupportTicket } from "../models/SupportTicket";
import { createError } from "../middleware/errorHandler";

export interface CreateTicketDTO {
  name: string;
  email: string;
  subject: string;
  message: string;
  priority?: string;
}

export interface UpdateTicketDTO {
  status?: string;
  priority?: string;
  message?: string;
}

class SupportTicketService {
  /**
   * Create a new support ticket.
   */
  static async createTicket(data: CreateTicketDTO): Promise<ISupportTicket> {
    const ticket = await SupportTicketModel.create({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      priority: data.priority ?? "normal",
      status: "open",
    });
    return ticket;
  }

  /**
   * List all tickets, newest first.
   */
  static async listTickets(): Promise<ISupportTicket[]> {
    return SupportTicketModel.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * Fetch a single ticket by its ID.
   * Throws if not found or invalid ID.
   */
  static async getTicket(ticketId: string): Promise<ISupportTicket> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw createError("Invalid ticket ID", 400);
    }
    const ticket = await SupportTicketModel.findById(ticketId).exec();
    if (!ticket) {
      throw createError("Ticket not found", 404);
    }
    return ticket;
  }

  /**
   * Update a ticket’s fields.
   * Throws if not found or invalid ID.
   */
  static async updateTicket(
    ticketId: string,
    updates: UpdateTicketDTO
  ): Promise<ISupportTicket> {
    if (!Types.ObjectId.isValid(ticketId)) {
      throw createError("Invalid ticket ID", 400);
    }
    const ticket = await SupportTicketModel.findByIdAndUpdate(
      ticketId,
      updates,
      { new: true, runValidators: true }
    ).exec();
    if (!ticket) {
      throw createError("Ticket not found", 404);
    }
    return ticket;
  }
}

export default SupportTicketService;
