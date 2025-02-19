import type { Document, Types, Model, CallbackError } from "mongoose";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// User Settings Interface
export interface UserSettings {
  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
    enableNotifications?: boolean;
  };
  privacy?: {
    profileVisibility?: "public" | "friends" | "private";
    searchVisibility?: boolean;
  };
}

// User Interface
export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  name?: string; // Add this field
  username: string;
  email: string;
  password: string;
  role: "user" | "admin" | "moderator";
  isVerified: boolean;
  isLocked?: boolean;
  active: boolean;
  profilePicture?: string;
  friends: Types.ObjectId[];
  friendRequests: Types.ObjectId[];
  points?: number;
  rewards: Types.ObjectId[];
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  subscriptions?: Types.ObjectId[];
  settings?: UserSettings;
  twoFactorSecret?: string;
  stripeCustomerId?: string;

  comparePassword(candidatePassword: string): Promise<boolean>;
  generateResetToken(): string;
}


// Define User Schema
const UserSchema: Schema<IUser> = new Schema(
  {
    firstName: { type: String },
    lastName: { type: String },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 8 },
    role: { type: String, enum: ["user", "admin", "moderator"], default: "user" },
    isVerified: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    profilePicture: { type: String },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    points: { type: Number, default: 0 },
    rewards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reward" }], // ObjectId[] for rewards
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subscription" }],
    stripeCustomerId: { type: String }, // Added stripeCustomerId field
    settings: {
      notifications: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        enableNotifications: { type: Boolean, default: true },
      },
      privacy: {
        profileVisibility: {
          type: String,
          enum: ["public", "friends", "private"],
          default: "public",
        },
        searchVisibility: { type: Boolean, default: true },
      },
    },
    twoFactorSecret: { type: String },
  },
  { timestamps: true },
);

// Password hashing
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

// Compare Password
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate Reset Token
UserSchema.methods.generateResetToken = function (): string {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  return resetToken;
};

// Export User Model
const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
export default User;
