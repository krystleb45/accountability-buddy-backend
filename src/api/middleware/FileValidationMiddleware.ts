import { Request, Response, NextFunction } from "express";
import fs from "fs";
import { logger } from "../../utils/winstonLogger";

// File size limit (e.g., 10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed file types
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "audio/mpeg",
  "audio/wav",
];

const FileValidationMiddleware = {
  /**
   * Validate file type and size
   * @param req Request object
   * @param res Response object
   * @param next Next middleware
   */
  validateFile: (req: Request, res: Response, next: NextFunction): void => {
    // Handle single file upload
    if (req.file) {
      validateSingleFile(req.file, res, next);
    } 
    
    // Handle multiple file uploads
    else if (req.files && Array.isArray(req.files)) {
      validateMultipleFiles(req.files, res, next);
    } 
    
    // Handle case where no files are uploaded
    else {
      logger.error("No file uploaded");
      res.status(400).json({ success: false, message: "No file uploaded" });
    }
  },
};

/**
 * Validate a single file
 * @param file The file object
 * @param res The response object
 * @param next The next middleware function
 */
const validateSingleFile = (file: Express.Multer.File, res: Response, next: NextFunction): void => {
  const fileSize = file.size;
  const fileType = file.mimetype;

  // Validate file type
  if (!ALLOWED_FILE_TYPES.includes(fileType)) {
    logger.error(`Invalid file type: ${fileType}`);
    res.status(400).json({
      success: false,
      message: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`,
    });
    return;
  }

  // Validate file size
  if (fileSize > MAX_FILE_SIZE) {
    logger.error(`File size exceeds the limit: ${fileSize} bytes`);
    res.status(400).json({
      success: false,
      message: `File size exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    });
    return;
  }

  // Validate file content (Check for corruption or empty file)
  fs.readFile(file.path, (err, data) => {
    if (err || !data || data.length === 0) {
      logger.error(`File is empty or corrupted: ${file.originalname}`);
      res.status(400).json({ success: false, message: "File is empty or corrupted" });
      return;
    }

    // Proceed to the next middleware if file is valid
    next();
  });
};

/**
 * Validate multiple files
 * @param files Array of file objects
 * @param res Response object
 * @param next Next middleware function
 */
const validateMultipleFiles = (
  files: Express.Multer.File[],
  res: Response,
  next: NextFunction
): void => {
  const invalidFiles: string[] = [];

  for (const file of files) {
    const fileSize = file.size;
    const fileType = file.mimetype;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(fileType)) {
      invalidFiles.push(`Invalid file type: ${file.originalname}`);
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      invalidFiles.push(`File size exceeds the limit: ${file.originalname}`);
    }

    // Validate file content (Check for corruption or empty file)
    const filePath = file.path;
    try {
      const data = fs.readFileSync(filePath);
      if (!data || data.length === 0) {
        invalidFiles.push(`File is empty or corrupted: ${file.originalname}`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        logger.error(`Error reading file: ${err.message}`);
        invalidFiles.push(`Error reading file: ${file.originalname}`);
      } else {
        logger.error(`Unknown error reading file: ${err}`);
        invalidFiles.push(`Unknown error reading file: ${file.originalname}`);
      }
    }
  }

  // If there are any invalid files, send the errors
  if (invalidFiles.length > 0) {
    logger.error(`Invalid files: ${invalidFiles.join(", ")}`);
    res.status(400).json({ success: false, message: invalidFiles.join(", ") });
    return;
  }

  // Proceed to the next middleware if all files are valid
  next();
};

export default FileValidationMiddleware;
