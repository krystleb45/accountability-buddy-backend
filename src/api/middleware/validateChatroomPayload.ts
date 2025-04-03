// middleware/validateChatroomPayload.ts
import { Request, Response, NextFunction } from "express";

/**
 * Middleware to validate the payload when creating a military chatroom
 * @route POST /api/military-support/chatrooms
 */
const validateChatroomPayload = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { name, description, members } = req.body;

  if (!name || typeof name !== "string" || name.trim().length < 3) {
    res.status(400).json({
      success: false,
      message: "Chatroom name must be at least 3 characters long.",
    });
    return;
  }

  if (!description || typeof description !== "string" || description.trim().length < 10) {
    res.status(400).json({
      success: false,
      message: "Chatroom description must be at least 10 characters long.",
    });
    return;
  }

  if (!Array.isArray(members) || members.length === 0) {
    res.status(400).json({
      success: false,
      message: "At least one member is required to create a chatroom.",
    });
    return;
  }

  // Optional: Validate that all members are strings (user IDs)
  const allValidIds = members.every((id) => typeof id === "string");
  if (!allValidIds) {
    res.status(400).json({
      success: false,
      message: "All member IDs must be valid strings.",
    });
    return;
  }

  next();
};

export default validateChatroomPayload;
