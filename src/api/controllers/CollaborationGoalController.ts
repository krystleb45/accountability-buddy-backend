// src/api/controllers/collaborationGoalController.ts
import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import sanitize from "mongo-sanitize";
import CollaborationGoalService from "../services/CollaborationGoalService";

export const createCollaborationGoal = catchAsync(
  async (
    req: Request<{}, any, { title: string; description: string; participants: string[] }>,
    res: Response
  ): Promise<void> => {
    const { title, description, participants } = sanitize(req.body);
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }
    if (!title || !description || !Array.isArray(participants) || participants.length === 0) {
      sendResponse(res, 400, false, "Title, description, and participants are required");
      return;
    }

    const goal = await CollaborationGoalService.create(
      userId,
      title,
      description,
      participants
    );
    sendResponse(res, 201, true, "Collaboration goal created successfully", { goal });
  }
);

export const getUserCollaborationGoals = catchAsync(
  async (_req: Request, res: Response): Promise<void> => {
    const userId = _req.user?.id;
    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    const goals = await CollaborationGoalService.getForUser(userId);
    if (!goals.length) {
      sendResponse(res, 404, false, "No collaboration goals found for this user");
      return;
    }

    sendResponse(res, 200, true, "Collaboration goals fetched successfully", { goals });
  }
);

export const deleteCollaborationGoal = catchAsync(
  async (req: Request<{ goalId: string }>, res: Response): Promise<void> => {
    const { goalId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    await CollaborationGoalService.delete(goalId, userId);
    sendResponse(res, 200, true, "Collaboration goal deleted successfully");
  }
);

export const addParticipant = catchAsync(
  async (
    req: Request<{}, any, { goalId: string; participantId: string }>,
    res: Response
  ): Promise<void> => {
    const { goalId, participantId } = sanitize(req.body);
    const userId = req.user?.id;
    if (!userId) {
      sendResponse(res, 400, false, "User ID is required");
      return;
    }

    const goal = await CollaborationGoalService.addParticipant(
      goalId,
      userId,
      participantId
    );
    sendResponse(res, 200, true, "Participant added successfully", { goal });
  }
);
