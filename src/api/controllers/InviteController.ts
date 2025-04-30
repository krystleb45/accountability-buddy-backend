import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import InviteService from "../services/InviteService";

export const sendGroupInvitation = catchAsync(
  async (req: Request<{ groupId: string }, {}, { recipientId: string }>, res: Response) => {
    const senderId = req.user!.id;
    const { groupId } = req.params;
    const { recipientId } = req.body;

    const invitation = await InviteService.sendInvitation(
      senderId,
      recipientId,
      groupId
    );

    sendResponse(res, 201, true, "Invitation sent successfully", { invitation });
  }
);

export const acceptGroupInvitation = catchAsync(
  async (req: Request<{}, {}, { invitationId: string }>, res: Response) => {
    const userId = req.user!.id;
    const { invitationId } = req.body;

    await InviteService.acceptInvitation(userId, invitationId);
    sendResponse(res, 200, true, "Invitation accepted successfully");
  }
);

export const rejectGroupInvitation = catchAsync(
  async (req: Request<{}, {}, { invitationId: string }>, res: Response) => {
    const userId = req.user!.id;
    const { invitationId } = req.body;

    await InviteService.rejectInvitation(userId, invitationId);
    sendResponse(res, 200, true, "Invitation rejected successfully");
  }
);

export const cancelGroupInvitation = catchAsync(
  async (req: Request<{}, {}, { invitationId: string }>, res: Response) => {
    const senderId = req.user!.id;
    const { invitationId } = req.body;

    await InviteService.cancelInvitation(senderId, invitationId);
    sendResponse(res, 200, true, "Invitation canceled successfully");
  }
);

export default {
  sendGroupInvitation,
  acceptGroupInvitation,
  rejectGroupInvitation,
  cancelGroupInvitation,
};
