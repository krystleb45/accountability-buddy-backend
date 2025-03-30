import { Request, Response, NextFunction } from "express";
import FileUpload from "../models/FileUpload";  // Import the model, not the interface
import { User } from "../models/User";  // Import the User model
import sendResponse from "../utils/sendResponse";  // Utility for sending responses
import { Types } from "mongoose";

/**
 * Middleware to ensure that users can only access files they are allowed to access
 * @desc Ensure user can only access files they uploaded or are permitted to access
 */
const fileAccessControlMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const fileId = req.params.fileId;  // The fileId from the request URL
    const userId = req.user?.id;  // The authenticated user's ID

    if (!userId) {
      sendResponse(res, 401, false, "Unauthorized");
      return;
    }

    // Check if the file exists in the database
    const file = await FileUpload.findById(fileId);
    if (!file) {
      sendResponse(res, 404, false, "File not found");
      return;
    }

    // Check if the file is uploaded by the user or shared with them
    if (file.userId.toString() !== userId.toString()) {
      // Add role-based checks if needed, e.g., user roles
      const user = await User.findById(userId);

      if (!user) {
        sendResponse(res, 404, false, "User not found");
        return;
      }

      if (user.role !== "admin" && !file.sharedWith.includes(new Types.ObjectId(userId))) {
        sendResponse(res, 403, false, "You do not have permission to access this file");
        return;
      }
      
    }

    // If the checks pass, proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Error in file access control middleware:", error);
    sendResponse(res, 500, false, "Internal server error");
  }
};

export default fileAccessControlMiddleware;
