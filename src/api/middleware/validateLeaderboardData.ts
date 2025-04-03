import { Request, Response, NextFunction } from "express";

/**
 * Middleware to validate leaderboard update or submission data.
 * Validates inputs like streakCount, points, and userId if provided in the request body.
 */
export const validateLeaderboardData = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const { userId, streakCount, points } = req.body;

  const errors: string[] = [];

  // userId may be optional if extracted from auth, but validate if present
  if (userId && typeof userId !== "string") {
    errors.push("User ID must be a valid string.");
  }

  if (
    streakCount !== undefined &&
    (typeof streakCount !== "number" || streakCount < 0)
  ) {
    errors.push("Streak count must be a non-negative number.");
  }

  if (points !== undefined && (typeof points !== "number" || points < 0)) {
    errors.push("Points must be a non-negative number.");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors,
    });
  }

  next();
};
