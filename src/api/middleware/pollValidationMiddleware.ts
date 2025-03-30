import { Request, Response, NextFunction } from "express";
import Poll from "../models/Poll"; // Poll model to validate poll existence
import { Types } from "mongoose";

// Middleware to validate poll creation
const validatePollCreation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { groupId, question, options, expirationDate } = req.body;

  // Validate required fields
  if (!groupId || !question || !options || options.length < 2 || !expirationDate) {
    res.status(400).json({ success: false, message: "All fields are required and options must have at least two choices." });
    return;
  }

  // Validate that expirationDate is in the future
  const expiration = new Date(expirationDate);
  if (expiration <= new Date()) {
    res.status(400).json({ success: false, message: "Poll expiration date must be in the future." });
    return;
  }

  // Validate poll options - Ensure all options are non-empty strings
  for (const option of options) {
    if (!option.option || typeof option.option !== "string" || option.option.trim().length === 0) {
      res.status(400).json({ success: false, message: "Each poll option must be a non-empty string." });
      return;
    }
  }

  // Validate groupId is a valid ObjectId
  if (!Types.ObjectId.isValid(groupId)) {
    res.status(400).json({ success: false, message: "Invalid group ID format." });
    return;
  }

  // If validation passes, proceed to the next middleware/controller
  next();
};

// Middleware to validate poll voting
const validatePollVote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { pollId, optionId, userId } = req.body;

  // Validate required fields
  if (!pollId || !optionId || !userId) {
    res.status(400).json({ success: false, message: "Poll ID, Option ID, and User ID are required." });
    return;
  }

  // Validate that pollId is a valid ObjectId
  if (!Types.ObjectId.isValid(pollId)) {
    res.status(400).json({ success: false, message: "Invalid poll ID format." });
    return;
  }

  // Check if the poll exists and is active
  const poll = await Poll.findById(pollId);
  if (!poll) {
    res.status(404).json({ success: false, message: "Poll not found." });
    return;
  }

  if (poll.status === "expired") {
    res.status(400).json({ success: false, message: "Poll has expired." });
    return;
  }

  // Validate that optionId exists in the poll options
  const option = poll.options.find((opt) => opt._id.toString() === optionId);
  if (!option) {
    res.status(400).json({ success: false, message: "Invalid option ID." });
    return;
  }

  // If validation passes, proceed to the next middleware/controller
  next();
};

export default {
  validatePollCreation,
  validatePollVote,
};
