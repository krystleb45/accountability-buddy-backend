import type { Router, Request, Response, NextFunction } from "express";
import express from "express";
import type { FileFilterCallback } from "multer";
import multer from "multer";
import * as fileUploadController from "../controllers/FileUploadController";
import { protect } from "../middleware/authMiddleware";
import rateLimit from "express-rate-limit";
import { logger } from "../../utils/winstonLogger";

const router: Router = express.Router();

/**
 * Rate limiter to prevent excessive file uploads.
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many uploads, please try again later",
});

/**
 * Multer configuration for file uploads.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

/**
 * @swagger
 * /file/upload:
 *   post:
 *     summary: Upload a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *       400:
 *         description: No file uploaded or validation error
 */
router.post(
  "/upload",
  protect,
  uploadLimiter,
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ success: false, msg: "No file uploaded" });
      return Promise.resolve();
    }
    try {
      await fileUploadController.saveFileMetadata(req, res, next);
    } catch (error) {
      logger.error(`Error uploading file: ${(error as Error).message}`, { error });
      next(error);
    }
  },
);

/**
 * @swagger
 * /file/download/{fileId}:
 *   get:
 *     summary: Download a file by ID
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB file ID
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *       400:
 *         description: Invalid file ID
 *       404:
 *         description: File not found
 */
router.get(
  "/download/:fileId",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileId } = req.params;
      if (!fileId.match(/^[0-9a-fA-F]{24}$/)) {
        const error = new Error("Invalid file ID");
        (error as any).status = 400;
        throw error;
      }
      await fileUploadController.downloadFile(req, res, next);
    } catch (error) {
      logger.error(`Error downloading file: ${(error as Error).message}`, { error });
      next(error);
    }
  },
);

/**
 * @swagger
 * /file/delete/{fileId}:
 *   delete:
 *     summary: Delete a file by ID
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB file ID
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       400:
 *         description: Invalid file ID
 *       404:
 *         description: File not found
 */
router.delete(
  "/delete/:fileId",
  protect,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileId } = req.params;
      if (!fileId.match(/^[0-9a-fA-F]{24}$/)) {
        const error = new Error("Invalid file ID");
        (error as any).status = 400;
        throw error;
      }
      await fileUploadController.deleteFile(req, res, next);
      res.status(200).json({ success: true, msg: "File deleted successfully" });
    } catch (error) {
      logger.error(`Error deleting file: ${(error as Error).message}`, { error });
      next(error);
    }
  },
);

export default router;
