import express from "express";
import * as FileUploadController from "../controllers/FileUploadController"; // Import named exports from controller
import FileValidationMiddleware from "../middleware/FileValidationMiddleware"; // Import file validation middleware
import { protect } from "../middleware/authMiddleware"; // Protect the route with authentication middleware

const router = express.Router();


// Route to upload a single file
router.post(
  "/chat/upload-file",
  protect,
  FileValidationMiddleware.validateFile, // File validation middleware
  FileUploadController.uploadFile // Single file upload handler
);

// Route to upload multiple files
router.post(
  "/chat/upload-multiple-files",
  protect,
  FileValidationMiddleware.validateFile, // File validation middleware
  FileUploadController.uploadMultipleFiles // Multiple files upload handler
);

// Route to fetch a file by file ID
router.get("/chat/files/:fileId", protect, FileUploadController.downloadFile);

// Route to delete a file by file ID
router.delete("/chat/files/:fileId", protect, FileUploadController.deleteFile);

export default router;
