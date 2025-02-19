import type { Response, NextFunction } from "express";
import MilitaryUser from "../models/MilitarySupport";
import logger from "../utils/winstonLogger"; // Logger setup
import type { MilitaryRequest, IMilitaryUser } from "../types/CustomRequest"; // Import the required types

/**
 * Middleware for verifying military user authentication and access.
 */
const militaryAuth = async (
  req: MilitaryRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Extract user ID from request object (validated earlier by other middleware)
    const userId = req.user?.id;

    // Check if user ID exists
    if (!userId) {
      res.status(401).json({ error: "Unauthorized access." });
      return; // Exit early
    }

    // Fetch military user based on ID
    const militaryUser = await MilitaryUser.findOne({ userId });

    // Validate military membership status
    if (!militaryUser || !militaryUser.isMilitary) {
      res.status(403).json({ error: "Access restricted to military members." });
      return; // Exit early
    }

    // Convert the document to a plain object and attach to the request
    req.militaryUser = militaryUser.toObject<IMilitaryUser>();

    // Proceed to the next middleware or route handler
    next();
  } catch (err) {
    // Log errors for debugging purposes
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    logger.error(`Military Authorization Error: ${errorMessage}`);

    // Send a generic error response
    res
      .status(500)
      .json({ error: "Authorization failed. Please try again later." });
  }
};

export default militaryAuth;
