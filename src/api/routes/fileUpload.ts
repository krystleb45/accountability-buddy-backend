// src/api/routes/fileUpload.ts
import { Router, Request, Response, NextFunction} from "express";
import path from "path";
import multer from "multer";
import { protect } from "../middleware/authMiddleware";
import catchAsync from "../utils/catchAsync";
import * as fileController from "../controllers/EventController"; // adjust if your controller lives elsewhere


// ─── Multer Setup ───────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, "../../uploads");
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // keep original name but sanitize in controller
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// ─── Router ────────────────────────────────────────────────────────────────────
const router = Router();

// POST /api/upload       → single file
router.post(
  "/upload",
  protect,
  upload.single("file"),
  catchAsync((req: Request, res: Response, next: NextFunction) =>
    fileController.uploadFile(req, res, next)
  )
);

// POST /api/uploads      → multiple files
router.post(
  "/uploads",
  protect,
  upload.any(),
  catchAsync((req: Request, res: Response, next: NextFunction) =>
    fileController.uploadMultipleFiles(req, res, next)
  )
);

// POST /api/upload/metadata → save metadata after upload
router.post(
  "/upload/metadata",
  protect,
  upload.single("file"),
  catchAsync((req: Request, res: Response, next: NextFunction) =>
    fileController.saveFileMetadata(req, res, next)
  )
);

// GET  /api/files/:fileId → download
router.get(
  "/files/:fileId",
  protect,
  catchAsync((req: Request, res: Response, next: NextFunction) =>
    fileController.downloadFile(req, res, next)
  )
);

// DELETE /api/uploads/:filename → remove from disk
router.delete(
  "/uploads/:filename",
  protect,
  catchAsync((req: Request, res: Response, next: NextFunction) =>
    fileController.deleteFile(req, res, next)
  )
);

export default router;
