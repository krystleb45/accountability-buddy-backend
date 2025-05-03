// src/api/routes/fileUpload.ts
import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import * as fileController from "../controllers/FileUploadController";

const router = Router();

/**
 * POST /api/upload
 * Upload a single file
 */
router.post(
  "/upload",
  protect,
  ...fileController.uploadSingle
);

/**
 * POST /api/uploads
 * Upload multiple files
 */
router.post(
  "/uploads",
  protect,
  ...fileController.uploadMultiple
);

/**
 * GET /api/uploads/:key/url
 * Generate a signed URL for downloading a file
 */
router.get(
  "/uploads/:key/url",
  protect,
  fileController.getSignedUrl
);

/**
 * DELETE /api/uploads/:key
 * Delete a file by key
 */
router.delete(
  "/uploads/:key",
  protect,
  fileController.deleteFile
);

export default router;
