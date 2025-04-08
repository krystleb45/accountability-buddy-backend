import express from "express";
import * as FileUploadController from "../controllers/FileUploadController"; // Import named exports from controller
import FileValidationMiddleware from "../middleware/FileValidationMiddleware"; // Import file validation middleware
import { protect } from "../middleware/authMiddleware"; // Protect the route with authentication middleware

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: File Upload
 *   description: Endpoints for uploading, downloading, and deleting files in chat
 */

/**
 * @swagger
 * /api/chat/upload-file:
 *   post:
 *     summary: Upload a single file
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
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
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid file
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/chat/upload-file",
  protect,
  FileValidationMiddleware.validateFile,
  FileUploadController.uploadFile
);

/**
 * @swagger
 * /api/chat/upload-multiple-files:
 *   post:
 *     summary: Upload multiple files
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *       400:
 *         description: Invalid file(s)
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/chat/upload-multiple-files",
  protect,
  FileValidationMiddleware.validateFile,
  FileUploadController.uploadMultipleFiles
);

/**
 * @swagger
 * /api/chat/files/{fileId}:
 *   get:
 *     summary: Download a file by its ID
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the file to download
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 */
router.get("/chat/files/:fileId", protect, FileUploadController.downloadFile);

/**
 * @swagger
 * /api/chat/files/{fileId}:
 *   delete:
 *     summary: Delete a file by its ID
 *     tags: [File Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the file to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: File not found
 */
router.delete("/chat/files/:fileId", protect, FileUploadController.deleteFile);

export default router;
