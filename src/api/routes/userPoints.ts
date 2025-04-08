import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { ParsedQs } from "qs";

/**
 * @desc    Update user points based on completed goals and milestones
 * @route   POST /api/users/:userId/points
 * @access  Private (Admin or user themselves)
 */
export const updateUserPoints = async (
  req: Request<{ userId: string }, any, { points: number }, ParsedQs>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { points } = req.body;

    // Basic validation
    if (!userId || points === undefined) {
      res.status(400).json({ message: "User ID and points are required." });
      return;
    }

    if (typeof points !== "number" || isNaN(points)) {
      res.status(400).json({ message: "Points must be a valid number." });
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: `User not found with ID: ${userId}` });
      return;
    }

    // Update points
    user.points += points;
    await user.save();

    res.status(200).json({
      message: "User points updated successfully.",
      user: { id: user.id, points: user.points },
    });
  } catch (error) {
    next(error); // Let global error handler manage the exception
  }
};
