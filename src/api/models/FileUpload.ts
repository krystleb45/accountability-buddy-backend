import sanitize from "mongo-sanitize";
import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the FileUpload interface
export interface IFileUpload extends Document {
  userId: Types.ObjectId;
  filePath: string;
  fileType: "image/jpeg" | "image/png" | "application/pdf" | "image/gif";
  fileSize: number;
  originalName: string;
  uploadDate: Date;
  isDeleted: boolean;
  downloadCount: number;
  sharedWith: Types.ObjectId[]; // New field for shared users
  getFileDetails: () => FileDetails;
  isImage: boolean; // Virtual field
}

// File details return type
interface FileDetails {
  userId: Types.ObjectId;
  filePath: string;
  fileType: string;
  fileSize: number;
  originalName: string;
  isDeleted: boolean;
  downloadCount: number;
  sharedWith: Types.ObjectId[]; // Include sharedWith in file details
}

// Define the FileUpload model interface for statics
interface IFileUploadModel extends Model<IFileUpload> {
  incrementDownloadCount(fileId: string): Promise<IFileUpload | null>;
  softDelete(fileId: string): Promise<IFileUpload | null>;
}

// Define the schema
const FileUploadSchema: Schema<IFileUpload> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    filePath: {
      type: String,
      required: [true, "File path is required"],
      trim: true,
      validate: {
        validator: function (value: string): boolean {
          return !value.includes("../") && !value.includes("..\\");
        },
        message: "Invalid file path",
      },
    },
    fileType: {
      type: String,
      required: true,
      enum: ["image/jpeg", "image/png", "application/pdf", "image/gif"],
    },
    fileSize: {
      type: Number,
      required: true,
      validate: {
        validator: function (value: number): boolean {
          return value <= 10 * 1024 * 1024;
        },
        message: "File size exceeds the 10MB limit",
      },
    },
    originalName: {
      type: String,
      trim: true,
      required: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    sharedWith: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: [], // Empty array by default
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to sanitize the file path and original name
FileUploadSchema.pre<IFileUpload>("save", function (next): void {
  try {
    this.filePath = sanitize(this.filePath);
    this.originalName = sanitize(this.originalName);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Static method to increment download count
FileUploadSchema.statics.incrementDownloadCount = async function (
  fileId: string,
): Promise<IFileUpload | null> {
  return this.findByIdAndUpdate(
    fileId,
    { $inc: { downloadCount: 1 } },
    { new: true },
  );
};

// Static method for soft deletion
FileUploadSchema.statics.softDelete = async function (
  fileId: string,
): Promise<IFileUpload | null> {
  return this.findByIdAndUpdate(
    fileId,
    { isDeleted: true },
    { new: true },
  );
};

// Instance method to get file details
FileUploadSchema.methods.getFileDetails = function (): FileDetails {
  return {
    userId: this.userId,
    filePath: this.filePath,
    fileType: this.fileType,
    fileSize: this.fileSize,
    originalName: this.originalName,
    isDeleted: this.isDeleted,
    downloadCount: this.downloadCount,
    sharedWith: this.sharedWith,
  };
};

// Virtual field to check if the file is an image
FileUploadSchema.virtual("isImage").get(function (): boolean {
  return ["image/jpeg", "image/png", "image/gif"].includes(this.fileType);
});

// Export the FileUpload model
const FileUpload: IFileUploadModel = mongoose.model<IFileUpload, IFileUploadModel>(
  "FileUpload",
  FileUploadSchema,
);

export default FileUpload;
