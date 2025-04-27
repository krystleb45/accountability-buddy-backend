import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import SupportTicketModel from "../models/SupportTicket"; // your Mongoose model
import { logger } from "../../utils/winstonLogger";

/**
 * @desc Contact support (create a new ticket)
 * @route POST /support/contact
 * @access Public
 */
export const contactSupport = catchAsync(
  async (req: Request<{}, {}, { name: string; email: string; subject: string; message: string; priority?: string }>, res: Response): Promise<void> => {
    const { name, email, subject, message, priority } = req.body;

    const ticket = await SupportTicketModel.create({
      name,
      email,
      subject,
      message,
      priority: priority || "normal",
      status: "open",
    });

    logger.info(`New support ticket ${ticket._id} created`);
    sendResponse(res, 201, true, "Support request submitted", { ticket });
  }
);

/**
 * @desc Get all support tickets
 * @route GET /support/tickets
 * @access Private (admin)
 */
export const getSupportTickets = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const tickets = await SupportTicketModel.find().sort({ createdAt: -1 });
    sendResponse(res, 200, true, "Support tickets fetched", { tickets });
  }
);

/**
 * @desc Get a single ticket
 * @route GET /support/tickets/:ticketId
 * @access Private (admin)
 */
export const getTicketDetails = catchAsync(
  async (req: Request<{ ticketId: string }>, res: Response): Promise<void> => {
    const { ticketId } = req.params;
    const ticket = await SupportTicketModel.findById(ticketId);
    if (!ticket) {
      sendResponse(res, 404, false, "Ticket not found");
      return;
    }
    sendResponse(res, 200, true, "Ticket details fetched", { ticket });
  }
);

/**
 * @desc Update a support ticket
 * @route PUT /support/tickets/:ticketId
 * @access Private (admin)
 */
export const updateSupportTicket = catchAsync(
  async (
    req: Request<{ ticketId: string }, {}, Partial<{ status: string; priority: string; message: string }>>,
    res: Response
  ): Promise<void> => {
    const { ticketId } = req.params;
    const updates = req.body;

    const ticket = await SupportTicketModel.findByIdAndUpdate(ticketId, updates, {
      new: true,
      runValidators: true,
    });
    if (!ticket) {
      sendResponse(res, 404, false, "Ticket not found");
      return;
    }

    sendResponse(res, 200, true, "Ticket updated successfully", { ticket });
  }
);
