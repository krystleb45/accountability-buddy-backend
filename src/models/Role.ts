import type { Document } from "mongoose";
import mongoose, { Schema } from "mongoose";

// Define the IRole interface
export interface IRole extends Document {
  roleName: string;
  permissions: string[];
  description?: string;
}

// Define the Role schema
const RoleSchema: Schema<IRole> = new Schema(
  {
    roleName: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      trim: true,
      maxlength: [100, "Role name cannot exceed 100 characters"],
    },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: (permissions: string[]) =>
          Array.isArray(permissions) && permissions.every((perm) => typeof perm === "string"),
        message: "Permissions must be an array of strings.",
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
  },
  { timestamps: true }, // Automatically adds `createdAt` and `updatedAt` fields
);

// Export the Role model
const Role = mongoose.model<IRole>("Role", RoleSchema);

export default Role;
