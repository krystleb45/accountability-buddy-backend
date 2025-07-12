// src/api/models/User.ts - Enhanced version with TypeScript fixes
import type { Document, Types, Model, CallbackError } from "mongoose";
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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

export interface ChatPreferences {
  preferredGroups?: Types.ObjectId[];
  directMessagesOnly?: boolean;
}

// Enhanced subscription types to match your pricing tiers
export type SubscriptionStatus = "trial" | "active" | "expired" | "canceled" | "past_due" | "trialing";
export type SubscriptionTier = "free-trial" | "basic" | "pro" | "elite";

export interface IUser extends Document {
  _id: Types.ObjectId;
  id: string; // Add this line - virtual field that maps to _id
  username: string;
  email: string;
  password: string;
  bio?: string;
  profileImage?: string;
  profilePicture?: string;
  coverImage?: string;
  role: "user" | "admin" | "moderator" | "military";
  isVerified: boolean;
  isAdmin: boolean;
  permissions: string[];
  isLocked?: boolean;
  active: boolean;
  isActive?: boolean;
  friends: Types.ObjectId[];
  friendRequests: Types.ObjectId[];
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  points: number;
  rewards: Types.ObjectId[];
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  twoFactorSecret?: string;
  firstName?: string;
  lastName?: string;

  // Enhanced Stripe/Subscription fields
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscription_status: SubscriptionStatus;
  subscriptionTier: SubscriptionTier;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  trial_start_date?: Date;
  trial_end_date?: Date;
  next_billing_date?: Date;
  billing_cycle?: "monthly" | "yearly";
  plan_change_at_period_end?: {
    newPlan: SubscriptionTier;
    newBillingCycle: "monthly" | "yearly";
    changeDate: Date;
  };

  interests?: string[];
  chatPreferences?: ChatPreferences;

  goals?: Array<{
    _id?: Types.ObjectId;
    title: string;
    category: "fitness" | "study" | "career" | "personal" | "health" | "finance" | "hobby" | "travel";
    description?: string;
    targetDate?: Date;
    status?: "active" | "completed" | "paused";
    priority?: "low" | "medium" | "high";
    createdAt?: Date;
    updatedAt?: Date;
  }>;

  location?: {
    country?: string;
    state?: string;
    city?: string;
    timezone?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };

  preferences?: {
    language?: string;
    theme?: "light" | "dark" | "auto";
    publicProfile?: boolean;
    showLocation?: boolean;
    showGoals?: boolean;
    showInterests?: boolean;
  };

  completedGoals?: number;
  streak?: number;
  streakCount: number;
  lastGoalCompletedAt?: Date;
  badges?: Types.ObjectId[];
  achievements?: Types.ObjectId[];
  pinnedGoals: Types.ObjectId[];
  featuredAchievements: Types.ObjectId[];
  settings?: UserSettings;
  activeStatus: "online" | "offline";
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateResetToken(): string;
  updatePoints(pointsToAdd: number): Promise<void>;
  updateStreak(): Promise<void>;
  awardBadge(badgeId: Types.ObjectId): Promise<void>;

  // New subscription-related methods
  canCreateGoal(): boolean;
  getGoalLimit(): number;
  hasFeatureAccess(feature: string): boolean;
  isSubscriptionActive(): boolean;
  isInTrial(): boolean;
  getDaysUntilTrialEnd(): number;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 8, select: false },
    bio: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    firstName: { type: String },
    lastName: { type: String },
    role: { type: String, enum: ["user", "admin", "moderator", "military"], default: "user" },
    isVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    permissions: { type: [String], default: [] },
    isLocked: { type: Boolean, default: false },
    active: { type: Boolean, default: true },

    // Relationships
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    rewards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Reward" }],
    achievements: [{ type: mongoose.Schema.Types.ObjectId, ref: "Achievement" }],
    badges: [{ type: mongoose.Schema.Types.ObjectId, ref: "Badge" }],
    pinnedGoals: [{ type: mongoose.Schema.Types.ObjectId, ref: "Goal" }],
    featuredAchievements: [{ type: mongoose.Schema.Types.ObjectId, ref: "Achievement" }],

    goals: [{
      title: { type: String, required: true },
      category: {
        type: String,
        enum: ["fitness", "study", "career", "personal", "health", "finance", "hobby", "travel"],
        required: true
      },
      description: { type: String },
      targetDate: { type: Date },
      status: {
        type: String,
        enum: ["active", "completed", "paused"],
        default: "active"
      },
      priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }],

    location: {
      country: { type: String },
      state: { type: String },
      city: { type: String },
      timezone: { type: String },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number }
      }
    },

    preferences: {
      language: { type: String, default: "en" },
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "light"
      },
      publicProfile: { type: Boolean, default: true },
      showLocation: { type: Boolean, default: false },
      showGoals: { type: Boolean, default: true },
      showInterests: { type: Boolean, default: true }
    },

    // Enhanced Stripe / Subscriptions
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    subscription_status: {
      type: String,
      enum: ["trial", "active", "expired", "canceled", "past_due", "trialing"],
      default: "trial",
    },
    subscriptionTier: {
      type: String,
      enum: ["free-trial", "basic", "pro", "elite"],
      default: "free-trial",
    },
    trial_start_date: { type: Date, default: Date.now },
    trial_end_date: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
    },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date },
    next_billing_date: { type: Date },
    billing_cycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly"
    },
    plan_change_at_period_end: {
      newPlan: {
        type: String,
        enum: ["free-trial", "basic", "pro", "elite"]
      },
      newBillingCycle: {
        type: String,
        enum: ["monthly", "yearly"]
      },
      changeDate: { type: Date }
    },

    // Gamification & Activity
    completedGoals: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    streakCount: { type: Number, default: 0 },
    lastGoalCompletedAt: { type: Date },
    points: { type: Number, default: 0 },

    // Communication & Interests
    interests: [{ type: String }],
    chatPreferences: {
      preferredGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Chat" }],
      directMessagesOnly: { type: Boolean, default: false },
    },

    activeStatus: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },

    // Security
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    // Settings
    settings: {
      notifications: {
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: false },
        enableNotifications: { type: Boolean, default: false },
      },
      privacy: {
        profileVisibility: { type: String, enum: ["public", "friends", "private"], default: "public" },
        searchVisibility: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
);

// Indexes
UserSchema.index({ interests: 1 });
UserSchema.index({ activeStatus: 1 });
UserSchema.index({ "goals.category": 1 });
UserSchema.index({ "location.city": 1 });
UserSchema.index({ "location.country": 1 });
UserSchema.index({ active: 1 });
UserSchema.index({ stripeCustomerId: 1 });
UserSchema.index({ stripeSubscriptionId: 1 });
UserSchema.index({ subscriptionTier: 1 });
UserSchema.index({ subscription_status: 1 });
UserSchema.index({ trial_end_date: 1 });

// Virtual fields
UserSchema.virtual("profilePicture").get(function() {
  return this.profileImage || "/default-avatar.png";
});

UserSchema.virtual("profilePicture").set(function(value: string) {
  this.profileImage = value;
});

UserSchema.virtual("isActive").get(function() {
  return this.active;
});

UserSchema.virtual("isActive").set(function(value: boolean) {
  this.active = value;
});

// Pre-save middleware
UserSchema.pre("save", function(next) {
  if (this.isModified("goals")) {
    this.goals?.forEach(goal => {
      if (!goal.createdAt) goal.createdAt = new Date();
      goal.updatedAt = new Date();
    });
  }
  next();
});

UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

// Password hashing
UserSchema.pre<IUser>(
  "save",
  async function (this: IUser, next: (err?: CallbackError) => void): Promise<void> {
    if (!this.isModified("password") || this.password.startsWith("$2")) {
      return next();
    }
    try {
      const rounds = parseInt(process.env.SALT_ROUNDS ?? "10", 10);
      this.password = await bcrypt.hash(this.password, rounds);
      next();
    } catch (err) {
      next(err as CallbackError);
    }
  }
);

// FIXED: Subscription-related methods with proper TypeScript typing
// src/api/models/User.ts - FIXED: Align goal status checking with GoalManagementService

// Add this method to replace the existing canCreateGoal method in your User schema:

UserSchema.methods.canCreateGoal = function(): boolean {
  const goalLimits: Record<SubscriptionTier, number> = {
    "free-trial": -1, // unlimited
    "basic": 3,
    "pro": -1, // unlimited
    "elite": -1 // unlimited
  };

  const tier = this.subscriptionTier as SubscriptionTier;
  const limit = goalLimits[tier] ?? 3; // default to 3 if tier not found

  // Return true for unlimited plans
  if (limit === -1) return true;

  // FIXED: Use the same status values as GoalManagementService
  // Note: This method is now mainly for quick checks -
  // the real validation should use GoalManagementService.getActiveGoalCount()
  const activeGoals = this.goals?.filter((goal: any) =>
    goal.status === "not-started" || goal.status === "in-progress"
  ).length || 0;

  return activeGoals < limit;
};

// Alternative: Remove embedded goals logic entirely and always use GoalManagementService
UserSchema.methods.canCreateGoalSimple = function(): boolean {
  const goalLimits: Record<SubscriptionTier, number> = {
    "free-trial": -1,
    "basic": 3,
    "pro": -1,
    "elite": -1
  };

  const tier = this.subscriptionTier as SubscriptionTier;
  const limit = goalLimits[tier] ?? 3;

  // For unlimited plans, always allow
  return limit === -1;
};

UserSchema.methods.hasFeatureAccess = function(feature: string): boolean {
  const featureAccess: Record<SubscriptionTier, string[]> = {
    "free-trial": ["all"],
    "basic": ["streak", "dailyPrompts", "groupChat"],
    "pro": ["streak", "dailyPrompts", "groupChat", "dmMessaging", "badges", "analytics"],
    "elite": ["all"]
  };

  const tier = this.subscriptionTier as SubscriptionTier;
  const userFeatures = featureAccess[tier] ?? ["streak", "dailyPrompts", "groupChat"]; // default to basic features
  return userFeatures.includes("all") || userFeatures.includes(feature);
};

UserSchema.methods.isSubscriptionActive = function(): boolean {
  return this.subscription_status === "active" || this.subscription_status === "trialing";
};

UserSchema.methods.isInTrial = function(): boolean {
  if (this.subscription_status === "trial" || this.subscription_status === "trialing") {
    if (this.trial_end_date) {
      return new Date() < new Date(this.trial_end_date);
    }
  }
  return false;
};

UserSchema.methods.getDaysUntilTrialEnd = function(): number {
  if (!this.trial_end_date) return 0;
  const now = new Date();
  const trialEnd = new Date(this.trial_end_date);
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Existing methods
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateResetToken = function (): string {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  return resetToken;
};

UserSchema.methods.updatePoints = async function (
  pointsToAdd: number
): Promise<void> {
  this.points = (this.points || 0) + pointsToAdd;
  await this.save();
};

UserSchema.methods.updateStreak = async function (): Promise<void> {
  const today = new Date();
  const lastCompleted = this.lastGoalCompletedAt;

  if (!lastCompleted || lastCompleted.toDateString() !== today.toDateString()) {
    this.streak = (this.streak || 0) + 1;
    this.streakCount = this.streak;
  }
  this.lastGoalCompletedAt = today;
  await this.save();
};

UserSchema.methods.awardBadge = async function (
  badgeId: Types.ObjectId
): Promise<void> {
  if (!this.badges.includes(badgeId)) {
    this.badges.push(badgeId);
    await this.save();
  }
};

export const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
