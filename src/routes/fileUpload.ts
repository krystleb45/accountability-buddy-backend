import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import type { FileFilterCallback } from "multer";
import multer from "multer";
import * as fileUploadController from "../controllers/FileUploadController"; // Corrected controller import path
import authMiddleware from "../middleware/authMiddleware"; // Corrected middleware import path
import rateLimit from "express-rate-limit";
import logger from "../utils/winstonLogger"; // Added logger utility

const router: Router = express.Router();

/**
 * Rate limiter to prevent excessive file uploads.
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 uploads per window
  message: "Too many uploads, please try again later",
});

/**
 * Multer configuration for file uploads.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/"); // Set the directory for uploads (ensure this directory exists)
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Set unique filenames
  },
});


/**
 * File filter for allowed types.
 */
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
  if (!allowedTypes.includes(file.mimetype)) {
    cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed."));
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter,
});

/**
 * @route   POST /file/upload
 * @desc    Upload a file
 * @access  Private
 */
router.post(
  "/upload",
  authMiddleware,
  uploadLimiter,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, msg: "No file uploaded" });
      return Promise.resolve(); // Ensures the function returns Promise<void>
    }    

    try {
      await fileUploadController.saveFileMetadata(req, res, next); // Process file
    } catch (error) {
      logger.error(`Error uploading file: ${(error as Error).message}`, { error });
      next(error); // Pass error to error-handling middleware
    }
  },
);



/**
 * @route   GET /file/download/:fileId
 * @desc    Download a file by ID
 * @access  Private
 */
router.get(
  "/download/:fileId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileId } = req.params;

      // Validate file ID format
      if (!fileId.match(/^[0-9a-fA-F]{24}$/)) {
        logger.warn(`Invalid file ID: ${fileId}`);
        const error = new Error("Invalid file ID");
        (error as any).status = 400; // Attach status code
        throw error; // Forward error to middleware
      }

      // Call controller to handle download
      await fileUploadController.downloadFile(req, res, next);
    } catch (error) {
      logger.error(`Error downloading file: ${(error as Error).message}`, { error });
      next(error); // Forward error to middleware
    }
  },
);

/**
 * @route   DELETE /file/delete/:fileId
 * @desc    Delete a file by ID
 * @access  Private
 */
router.delete(
  "/delete/:fileId",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileId } = req.params;

      // Validate file ID format
      if (!fileId.match(/^[0-9a-fA-F]{24}$/)) {
        logger.warn(`Invalid file ID: ${fileId}`);
        const error = new Error("Invalid file ID");
        (error as any).status = 400; // Attach status code
        throw error; // Forward error to middleware
      }

      // Call controller to handle file deletion
      await fileUploadController.deleteFile(req, res, next);

      // Success response
      res.status(200).json({ success: true, msg: "File deleted successfully" });
    } catch (error) {
      logger.error(`Error deleting file: ${(error as Error).message}`, { error });
      next(error); // Forward error to middleware
    }
  },
);


export default router;
