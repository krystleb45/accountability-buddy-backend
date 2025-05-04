// src/api/middleware/FileAccessControlMiddleware.ts
import type { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import FileUpload from "../models/FileUpload";
import { User } from "../models/User";
import sendResponse from "../utils/sendResponse";

/**
 * Ensure only the owner (or an admin) can access a given file.
 */
export default async function fileAccessControl(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const fileId = req.params.fileId;
  const userId = req.user?.id;

  if (!userId) {
    sendResponse(res, 401, false, "Unauthorized");
    return;
  }

  // Must be a valid ObjectId
  if (!Types.ObjectId.isValid(fileId)) {
    sendResponse(res, 400, false, "Invalid file ID");
    return;
  }

  const file = await FileUpload.findById(fileId).lean();
  if (!file) {
    sendResponse(res, 404, false, "File not found");
    return;
  }

  // If you're the uploader, you're good
  if (new Types.ObjectId(userId).equals(file.user)) {
    return next();
  }

  // Otherwise check if you're an admin
  const user = await User.findById(userId).select("role");
  if (!user) {
    sendResponse(res, 404, false, "User not found");
    return;
  }
  if (user.role === "admin") {
    return next();
  }

  // All other cases: forbidden
  sendResponse(res, 403, false, "You do not have permission to access this file");
}
