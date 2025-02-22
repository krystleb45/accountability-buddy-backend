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

// ✅ Chat Preferences Interface
export interface ChatPreferences {
  preferredGroups?: Types.ObjectId[]; // Groups user prefers
  directMessagesOnly?: boolean; // If true, user prefers private messages over groups
}

// ✅ User Interface
export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  name?: string;
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
  completedGoals?: number;
  streak?: number;
  achievements?: mongoose.Types.ObjectId[];
  lastGoalCompletedAt?: Date;
  
  // ✅ Free Trial & Subscription Fields
  trial_start_date?: Date;
  subscription_status: "trial" | "active" | "expired";
  next_billing_date?: Date;
  stripeCustomerId?: string;

  // ✅ Chat Features
  interests?: string[]; // User interests for chat recommendations
  chatPreferences?: ChatPreferences; // Preferred chat settings
  activeStatus: "online" | "offline"; // Track user online status

  comparePassword(candidatePassword: string): Promise<boolean>;
  generateResetToken(): string;
}

// ✅ Define User Schema
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
    rewards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reward" }],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subscription" }],
    stripeCustomerId: { type: String },

    // ✅ Free Trial & Subscription Tracking
    trial_start_date: { type: Date, default: null },
    subscription_status: { type: String, enum: ["trial", "active", "expired"], default: "trial" },
    next_billing_date: { type: Date, default: null },

    // ✅ User Settings
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

    // ✅ Leaderboards & Achievements Fields
    completedGoals: { type: Number, default: 0, min: 0 },
    streak: { type: Number, default: 0, min: 0 },
    lastGoalCompletedAt: { type: Date, default: null },
    achievements: [{ type: mongoose.Schema.Types.ObjectId, ref: "Achievement" }],

    // ✅ Chat Features
    interests: [{ type: String, trim: true }], // Store user-defined interests
    chatPreferences: {
      preferredGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Chat" }],
      directMessagesOnly: { type: Boolean, default: false },
    },
    activeStatus: { type: String, enum: ["online", "offline"], default: "offline" }, // Track user status
  },
  { timestamps: true }
);

// ✅ Indexes for Faster Querying
UserSchema.index({ email: 1 }); // Optimize email lookups
UserSchema.index({ username: 1 }); // Optimize username lookups
UserSchema.index({ interests: 1 }); // Optimize chat recommendations
UserSchema.index({ activeStatus: 1 }); // Optimize active user tracking

// ✅ Password hashing & streak handling
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    // ✅ Ensure streak is always a positive number
    this.streak = Math.max(this.streak ?? 0, 0);

    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

// ✅ Compare Password
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// ✅ Generate Reset Token
UserSchema.methods.generateResetToken = function (): string {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  return resetToken;
};

// ✅ Export User Model
const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
export default User;
