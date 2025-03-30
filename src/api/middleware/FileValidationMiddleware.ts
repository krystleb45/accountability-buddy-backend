import { Request, Response, NextFunction } from "express";
import fs from "fs";
import { logger } from "../../utils/winstonLogger";

// File size limit (e.g., 10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed file types
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "application/pdf", "audio/mpeg", "audio/wav"];

const FileValidationMiddleware = {
  /**
   * Validate file type and size
   * @param req Request object
   * @param res Response object
   * @param next Next middleware
   */
  validateFile: (req: Request, res: Response, next: NextFunction): void => {
    if (!req.file) {
      logger.error("No file uploaded");
      res.status(400).json({ success: false, message: "No file uploaded" });
      return;
    }

    const file = req.file;
    const fileSize = file.size;
    const fileType = file.mimetype;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(fileType)) {
      logger.error(`Invalid file type: ${fileType}`);
      res.status(400).json({ success: false, message: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}` });
      return;
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      logger.error(`File size exceeds the limit: ${fileSize} bytes`);
      res.status(400).json({ success: false, message: `File size exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` });
      return;
    }

    // Validate file content (Basic check for empty file or corruption)
    fs.readFile(file.path, (err, data) => {
      if (err || !data || data.length === 0) {
        logger.error(`File is empty or corrupted: ${file.originalname}`);
        res.status(400).json({ success: false, message: "File is empty or corrupted" });
        return;
      }

      // If the file passes all validations, proceed to the next middleware
      next();
    });
  },
};

export default FileValidationMiddleware;
