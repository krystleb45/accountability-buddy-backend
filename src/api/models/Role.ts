import type { Document, Model } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Role Document Interface ---
export interface IRole extends Document {
  roleName: string;               // Unique name of the role
  permissions: string[];          // List of permission identifiers
  description?: string;           // Optional human-readable description
  createdAt: Date;                // Auto-generated
  updatedAt: Date;                // Auto-generated

  // Instance methods
  hasPermission(permission: string): boolean;
  addPermission(permission: string): Promise<IRole>;
  removePermission(permission: string): Promise<IRole>;
}

// --- Role Model Static Interface ---
export interface IRoleModel extends Model<IRole> {
  findByName(name: string): Promise<IRole | null>;
  getRolesWithPermission(permission: string): Promise<IRole[]>;
}

// --- Schema Definition ---
const RoleSchema = new Schema<IRole, IRoleModel, IRole>(
  {
    roleName: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      trim: true,
      maxlength: [100, "Role name cannot exceed 100 characters"],
      index: true,
    },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: (perms: string[]): boolean =>
          Array.isArray(perms) && perms.every((p) => typeof p === "string"),
        message: "Permissions must be an array of strings",
      },
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// --- Instance Methods ---
// Check if role includes a specific permission
RoleSchema.methods.hasPermission = function (this: IRole, permission: string): boolean {
  return this.permissions.includes(permission);
};

// Add a permission (if not already present)
RoleSchema.methods.addPermission = async function (
  this: IRole,
  permission: string
): Promise<IRole> {
  if (!this.permissions.includes(permission)) {
    this.permissions.push(permission);
    await this.save();
  }
  return this;
};

// Remove a permission
RoleSchema.methods.removePermission = async function (
  this: IRole,
  permission: string
): Promise<IRole> {
  this.permissions = this.permissions.filter((p) => p !== permission);
  await this.save();
  return this;
};

// --- Static Methods ---
// Find a role by its name
RoleSchema.statics.findByName = function (
  this: IRoleModel,
  name: string
): Promise<IRole | null> {
  return this.findOne({ roleName: name }).exec();
};

// Get all roles that include a given permission
RoleSchema.statics.getRolesWithPermission = function (
  this: IRoleModel,
  permission: string
): Promise<IRole[]> {
  return this.find({ permissions: permission }).exec();
};

// --- Model Export ---
export const Role = mongoose.model<IRole, IRoleModel>(
  "Role",
  RoleSchema
);

export default Role;
