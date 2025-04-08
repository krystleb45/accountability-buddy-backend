import path from "path";

// For AWS S3 configuration
export const s3Config = {
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  bucketName: process.env.S3_BUCKET || "",
};

// For local disk storage configuration
export const localStorageConfig = {
  storagePath: path.join(__dirname, "../../uploads"), // Path for local file storage
  maxFileSize: 10 * 1024 * 1024, // Max file size (e.g., 10MB)
  allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf", "image/gif"], // Allowed file types
};

// Choose storage provider here: S3 or Local Disk
const isS3Storage = process.env.STORAGE_TYPE === "s3";

export const storageConfig = isS3Storage ? s3Config : localStorageConfig;

export default storageConfig;
