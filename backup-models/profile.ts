// src/api/models/Profile.ts
import type { Document, Model, Types } from "mongoose";
import mongoose, { Schema } from "mongoose";

// --- Profile Document Interface ---
export interface IProfile extends Document {
  user: Types.ObjectId;          // Reference to the User model
  name: string;
  email: string;
  bio?: string;                  // Optional bio
  profilePicture?: string;       // Optional profile picture URL
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  updateProfile(data: Partial<Pick<IProfile, "name" | "bio" | "profilePicture">>): Promise<IProfile>;
}

// --- Profile Model Static Interface ---
export interface IProfileModel extends Model<IProfile> {
  findByUserId(userId: Types.ObjectId): Promise<IProfile | null>;
  createOrUpdate(
    userId: Types.ObjectId,
    data: { name: string; email: string; bio?: string; profilePicture?: string }
  ): Promise<IProfile>;
}

// --- Schema Definition ---
const ProfileSchema = new Schema<IProfile, IProfileModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,               // uniqueness still declared here
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,               // uniqueness still declared here
      match: [/\S+@\S+\.\S+/, "Invalid email address"],
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    profilePicture: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: false },
    toObject: { virtuals: false },
  }
);

// --- Indexes ---
ProfileSchema.index({ user: 1 });
ProfileSchema.index({ email: 1 });

// --- Middleware Hooks ---
// Ensure email is lowercase
ProfileSchema.pre<IProfile>("save", function (next) {
  this.email = this.email.toLowerCase();
  next();
});

// --- Instance Methods ---
ProfileSchema.methods.updateProfile = async function (
  this: IProfile,
  data: Partial<Pick<IProfile, "name" | "bio" | "profilePicture">>
): Promise<IProfile> {
  if (data.name !== undefined) this.name = data.name;
  if (data.bio !== undefined) this.bio = data.bio;
  if (data.profilePicture !== undefined) this.profilePicture = data.profilePicture;
  await this.save();
  return this;
};

// --- Static Methods ---
ProfileSchema.statics.findByUserId = function (
  this: IProfileModel,
  userId: Types.ObjectId
): Promise<IProfile | null> {
  return this.findOne({ user: userId });
};

ProfileSchema.statics.createOrUpdate = async function (
  this: IProfileModel,
  userId: Types.ObjectId,
  data: { name: string; email: string; bio?: string; profilePicture?: string }
): Promise<IProfile> {
  const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
  const updateDoc = { user: userId, ...data };
  const profile = await this.findOneAndUpdate({ user: userId }, updateDoc, opts);
  if (!profile) {
    throw new Error("Failed to create or update profile");
  }
  return profile;
};

// --- Model Export ---
export const Profile = mongoose.model<IProfile, IProfileModel>(
  "Profile",
  ProfileSchema
);

export default Profile;
