// src/api/controllers/SupportController.ts
import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import { logger } from "../../utils/winstonLogger";
import SupportTicketService, { CreateTicketDTO, UpdateTicketDTO } from "../services/SupportTicketService";

/**
 * @desc    Contact support (create a new ticket)
 * @route   POST /support/contact
 * @access  Public
 */
export const contactSupport = catchAsync(
  async (
    req: Request<{}, {}, CreateTicketDTO>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const ticket = await SupportTicketService.createTicket(req.body);
    logger.info(`New support ticket ${ticket._id} created`);
    sendResponse(res, 201, true, "Support request submitted", { ticket });
  }
);

/**
 * @desc    Get all support tickets
 * @route   GET /support/tickets
 * @access  Private (admin)
 */
export const getSupportTickets = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction): Promise<void> => {
    const tickets = await SupportTicketService.listTickets();
    sendResponse(res, 200, true, "Support tickets fetched", { tickets });
  }
);

/**
 * @desc    Get a single ticket
 * @route   GET /support/tickets/:ticketId
 * @access  Private (admin)
 */
export const getTicketDetails = catchAsync(
  async (
    req: Request<{ ticketId: string }>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const ticket = await SupportTicketService.getTicket(req.params.ticketId);
    sendResponse(res, 200, true, "Ticket details fetched", { ticket });
  }
);

/**
 * @desc    Update a support ticket
 * @route   PUT /support/tickets/:ticketId
 * @access  Private (admin)
 */
export const updateSupportTicket = catchAsync(
  async (
    req: Request<{ ticketId: string }, {}, UpdateTicketDTO>,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const ticket = await SupportTicketService.updateTicket(
      req.params.ticketId,
      req.body
    );
    sendResponse(res, 200, true, "Ticket updated successfully", { ticket });
  }
);
