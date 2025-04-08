
export interface IUser {
  id: string;
  email: string;
  role: "user" | "admin" | "moderator" | "military";
  trial_start_date?: Date;
  subscription_status?: "active" | "trial" | "expired";
  next_billing_date?: Date;
  isAdmin: boolean;
  username: string;
  points: number;
  rewards: any; // Adjust as needed
  streakCount: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: string[];
}






// Optional: Define a type for filtering users when querying
export interface IUserFilters {
  role?: "user" | "admin" | "moderator" | "military"; // Allow filtering by 'military' role
  isVerified?: boolean;
  points?: number;
}

export interface IUserProfileResponse {
  username: string;
  email: string;
  points: number;
  streakCount: number;
  rewards: string[];
  createdAt: Date;
  updatedAt: Date;
}
