import path from "path";
import fs from "fs";
import sanitizeFilename from "sanitize-filename";
import { execSync } from "child_process";
import type { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import logger from "../utils/winstonLogger";


// Custom input sanitization function
const sanitizeInput = (input: any): any => {
  if (typeof input === "string") {
    return input.replace(/[^\w\s.@-]/g, "");
  }
  if (typeof input === "object" && input !== null) {
    const sanitized: Record<string, any> = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
};

// Virus scan utility function
const scanFileForVirus = (filePath: string): boolean => {
  try {
    const result = execSync(`clamscan ${filePath}`).toString();
    return !result.includes("FOUND");
  } catch (error) {
    logger.error("Error during virus scan: " + (error as Error).message);
    return false;
  }
};

/**
 * @desc    Upload a single file
 * @route   POST /api/upload
 * @access  Private
 */
export const uploadFile = catchAsync(async (
  req: Request<Record<string, any>, any, any, Record<string, any>> & { file?: Express.Multer.File },
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  req.params = sanitizeInput(req.params);
  req.body = sanitizeInput(req.body);

  if (!req.file) {
    sendResponse(res, 400, false, "No file uploaded");
    return;
  }

  const filePath = path.join(__dirname, "../uploads", req.file.filename);

  if (!scanFileForVirus(filePath)) {
    fs.unlinkSync(filePath);
    sendResponse(res, 400, false, "File contains a virus and was not uploaded");
    return;
  }

  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  sendResponse(res, 200, true, "File uploaded successfully", { fileUrl });
});

/**
 * @desc    Upload multiple files
 * @route   POST /api/uploads
 * @access  Private
 */
export const uploadMultipleFiles = catchAsync(async (
  req: Request<Record<string, any>, any, any, Record<string, any>> & { files?: Express.Multer.File[] },
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  req.params = sanitizeInput(req.params);
  req.body = sanitizeInput(req.body);

  if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
    sendResponse(res, 400, false, "No files uploaded");
    return;
  }

  const fileUrls: string[] = [];
  for (const file of req.files) {
    const filePath = path.join(__dirname, "../uploads", file.filename);

    if (!scanFileForVirus(filePath)) {
      fs.unlinkSync(filePath);
      continue;
    }

    fileUrls.push(`${req.protocol}://${req.get("host")}/uploads/${file.filename}`);
  }

  if (fileUrls.length === 0) {
    sendResponse(res, 400, false, "No files uploaded due to virus detection");
    return;
  }

  sendResponse(res, 200, true, "Files uploaded successfully", { fileUrls });
});
// Save file metadata
export const saveFileMetadata = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { originalname, mimetype, size, filename } = req.file as Express.Multer.File;

    // Example logic: save file info to the database (or log it for now)
    const fileInfo = {
      filename,
      originalname,
      mimetype,
      size,
      uploadedBy: req.user?.id, // Assuming req.user.id exists via authMiddleware
    };

    logger.info(`File uploaded successfully: ${JSON.stringify(fileInfo)}`);
    sendResponse(res, 201, true, "File uploaded successfully", fileInfo);
  } catch (error) {
    logger.error(`Error saving file metadata: ${(error as Error).message}`);
    next(error); // Pass error to middleware
  }
};
// Download file function
export const downloadFile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { fileId } = req.params;

    // Simulate fetching file info based on ID (replace with DB call if needed)
    const filePath = path.join(__dirname, "../../uploads/", `${fileId}.pdf`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      sendResponse(res, 404, false, "File not found");
      return;
    }

    // Set headers for download
    res.download(filePath, (err) => {
      if (err) {
        logger.error(`Error downloading file: ${err.message}`);
        next(err); // Pass error to middleware
      }
    });
  } catch (error) {
    logger.error(`Error processing file download: ${(error as Error).message}`);
    next(error);
  }
};
/**
 * @desc    Delete a file
 * @route   DELETE /api/uploads/:filename
 * @access  Private
 */
export const deleteFile = catchAsync(async (
  req: Request<Record<string, any>, any, any, Record<string, any>>,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  req.params = sanitizeInput(req.params);
  const filename = sanitizeFilename(req.params.filename) || "unknown-file";
  const filePath = path.join(__dirname, "../uploads", filename);

  if (!fs.existsSync(filePath)) {
    sendResponse(res, 404, false, "File not found");
    return;
  }

  fs.unlinkSync(filePath);
  sendResponse(res, 200, true, "File deleted successfully");
});
