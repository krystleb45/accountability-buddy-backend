// src/api/controllers/FileUploadController.ts
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import FileUploadService from "../services/FileUploadService";
import * as FileCleanupService from "../services/FileCleanupService";

const upload = multer({
  dest: path.join(__dirname, "../uploads/tmp"),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadSingle = [
  upload.single("file"),
  catchAsync(async (req: Request, res: Response) => {
    if (!req.file) {
      sendResponse(res, 400, false, "No file uploaded");
      return;
    }

    const tmpPath = req.file.path;
    const clean = await FileCleanupService.scanOrDelete(tmpPath);
    if (!clean) {
      sendResponse(res, 400, false, "File contained a virus and was removed");
      return;
    }

    const buffer = fs.readFileSync(tmpPath);
    const { url, key } = await FileUploadService.uploadToS3({
      buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
    });

    fs.unlinkSync(tmpPath);
    sendResponse(res, 201, true, "File uploaded successfully", { url, key });
    return;
  }),
];

export const uploadMultiple = [
  upload.array("files"),
  catchAsync(async (req: Request, res: Response) => {
    const files = Array.isArray(req.files) ? req.files as Express.Multer.File[] : [];
    if (files.length === 0) {
      sendResponse(res, 400, false, "No files uploaded");
      return;
    }

    const results: Array<{ url: string; key: string }> = [];

    for (const file of files) {
      const tmpPath = file.path;
      if (!await FileCleanupService.scanOrDelete(tmpPath)) {
        continue;
      }
      const buffer = fs.readFileSync(tmpPath);
      const out = await FileUploadService.uploadToS3({
        buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      });
      results.push(out);
      fs.unlinkSync(tmpPath);
    }

    if (results.length === 0) {
      sendResponse(res, 400, false, "All files were rejected due to virus detection");
      return;
    }

    sendResponse(res, 201, true, "Files uploaded successfully", { files: results });
    return;
  }),
];

export const getSignedUrl = catchAsync(async (req: Request<{ key: string }>, res: Response) => {
  try {
    const url = await FileUploadService.generateSignedUrl(req.params.key);
    sendResponse(res, 200, true, "Signed URL generated", { url });
  } catch (err) {
    sendResponse(res, 404, false, (err as Error).message);
  }
  return;
});

export const deleteFile = catchAsync(async (req: Request<{ key: string }>, res: Response) => {
  try {
    const { message } = await FileUploadService.deleteFromS3(req.params.key);
    sendResponse(res, 200, true, message);
  } catch (err) {
    sendResponse(res, 404, false, (err as Error).message);
  }
  return;
});

export default {
  uploadSingle,
  uploadMultiple,
  getSignedUrl,
  deleteFile,
};
