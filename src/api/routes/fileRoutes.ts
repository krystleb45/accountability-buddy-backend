import express from "express";
import multer from "multer"; // Import multer to handle file uploads
import * as FileUploadController from "../controllers/FileUploadController"; // Import the named exports
import FileValidationMiddleware from "../middleware/FileValidationMiddleware"; // Import file validation middleware
import { protect } from "../middleware/authMiddleware"; // Protect the route with authentication middleware

const router = express.Router();

// Set up Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/"); // Files will be saved in the 'uploads' folder
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Create unique file names
  },
});

// Multer file filter (if needed)
const fileFilter = (_req: any, file: any, cb: any): void => {
  const allowedTypes = ["image/jpeg", "image/png", "application/pdf", "image/gif"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Invalid file type"));
  }
  cb(null, true);
};

// Multer middleware for handling multiple files
const upload = multer({ storage, fileFilter }).array("files", 10); // Maximum of 10 files

// Route to upload a single file
router.post(
  "/chat/upload-file",
  protect, 
  FileValidationMiddleware.validateFile,
  FileUploadController.uploadFile
);

// Route to upload multiple files
router.post(
  "/chat/upload-multiple-files",
  protect, 
  upload, // Multer middleware for handling multiple file uploads
  FileValidationMiddleware.validateFile, 
  FileUploadController.uploadMultipleFiles
);

// Route to fetch a file by file ID
router.get("/chat/files/:fileId", protect, FileUploadController.downloadFile);

// Route to delete a file by file ID
router.delete("/chat/files/:fileId", protect, FileUploadController.deleteFile);

export default router;
