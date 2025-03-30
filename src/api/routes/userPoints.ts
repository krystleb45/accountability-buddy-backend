import { Request, Response, NextFunction } from "express";
import { User } from "../models/User"; // Ensure the User model is imported correctly
import { ParsedQs } from "qs"; // Import ParsedQs from qs

/**
 * @desc    Update user points based on completed goals and milestones
 * @route   POST /api/users/:userId/points
 * @access  Private (Admin or user themselves)
 */
export const updateUserPoints = async (
  req: Request<{ userId: string }, any, any, ParsedQs, Record<string, any>>, // Declare the types for the `Request` object, including ParsedQs for query parameters
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { userId } = req.params; // Get userId from route parameters
  const { points } = req.body; // Get points from request body

  try {
    if (!userId || !points) {
      res.status(400).json({ message: "User ID and points are required." });
      return; // Simply return to stop the function execution
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: "User not found." });
      return; // Simply return to stop further processing
    }

    // Update user points logic here (e.g., add points to the user)
    user.points += points;
    await user.save();

    res.status(200).json({
      message: `User points updated successfully for user ${userId}.`,
      user: { id: user.id, points: user.points },
    });

    // Instead of returning a response here, we rely on Express’s standard behavior of ending the response
    // after calling res.status(...).json(...).
    // We don't need to explicitly return anything other than void here.
  } catch (error) {
    next(error); // Pass error to the next middleware (global error handler)
  }
};
