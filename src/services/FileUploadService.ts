import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand, 
  GetObjectCommand, 
  ObjectCannedACL 
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/winstonLogger";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ✅ Initialize S3 Client with Environment Credentials
const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface File {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

const FileUploadService = {
  /**
   * ✅ Upload a file to S3
   * @param file - File object (e.g., from Multer)
   * @returns Upload result containing URL and key
   */
  uploadToS3: async (file: File): Promise<{ success: boolean; url: string; key: string }> => {
    try {
      if (!file || !file.buffer || !file.originalname) {
        throw new Error("Invalid file input");
      }

      const uniqueFileName = `${uuidv4()}-${file.originalname}`;
      const bucketName = process.env.S3_BUCKET;

      if (!bucketName) {
        throw new Error("S3_BUCKET environment variable is not defined");
      }

      const uploadParams = {
        Bucket: bucketName,
        Key: uniqueFileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: ObjectCannedACL.private, // ✅ FIX: Use the enum instead of a string
        ContentDisposition: "inline",
      };

      await s3.send(new PutObjectCommand(uploadParams));

      logger.info(`✅ File uploaded to S3: ${uniqueFileName}`);

      return {
        success: true,
        url: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`,
        key: uniqueFileName,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error uploading file to S3: ${errorMessage}`);
      throw new Error("File upload failed");
    }
  },

  /**
   * ✅ Delete a file from S3
   * @param fileKey - S3 key of the file to delete
   * @returns Result of file deletion
   */
  deleteFromS3: async (fileKey: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!fileKey) {
        throw new Error("File key is required for deletion");
      }

      const bucketName = process.env.S3_BUCKET;

      if (!bucketName) {
        throw new Error("S3_BUCKET environment variable is not defined");
      }

      const deleteParams = {
        Bucket: bucketName,
        Key: fileKey,
      };

      await s3.send(new DeleteObjectCommand(deleteParams));

      logger.info(`✅ File deleted from S3: ${fileKey}`);

      return { success: true, message: "File deleted successfully" };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error deleting file from S3: ${errorMessage}`);
      throw new Error("File deletion failed");
    }
  },

  /**
   * ✅ Generate a signed URL for accessing files securely
   * @param fileKey - S3 key of the file
   * @param expires - Expiration time for the signed URL in seconds
   * @returns Signed URL
   */
  generateSignedUrl: async (fileKey: string, expires: number = 60 * 5): Promise<string> => {
    try {
      if (!fileKey) {
        throw new Error("File key is required to generate a signed URL");
      }

      const bucketName = process.env.S3_BUCKET;

      if (!bucketName) {
        throw new Error("S3_BUCKET environment variable is not defined");
      }

      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
      });

      const signedUrl = await getSignedUrl(s3, command, { expiresIn: expires });

      logger.info(`✅ Signed URL generated for file: ${fileKey}`);

      return signedUrl;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`❌ Error generating signed URL for file: ${errorMessage}`);
      throw new Error("Failed to generate signed URL");
    }
  },
};

export default FileUploadService;
