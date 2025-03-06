import multer from "multer";
import path from "path";
import fs from "fs";

// ✅ Ensure the `uploads` directory exists
const ensureUploadsFolder = (folderPath: string):void => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

// ✅ Define Storage Configuration for Profile & Cover Images
const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let folderPath = "";
    if (file.fieldname === "profilePicture") {
      folderPath = "uploads/profile";
    } else if (file.fieldname === "coverImage") {
      folderPath = "uploads/covers";
    }

    ensureUploadsFolder(folderPath);
    cb(null, folderPath);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// ✅ File Type & Size Validation
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Only JPEG, PNG, and WEBP files are allowed!"));
  }
  cb(null, true);
};

// ✅ Max File Size: 2MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

export default upload;
