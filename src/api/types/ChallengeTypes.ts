import { Document, Types } from "mongoose";

// Define the type for Challenge participants
export interface IParticipant {
  user: Types.ObjectId; // User reference, an ObjectId linking to the User model
  progress: number; // The progress of the participant in the challenge
  joinedAt: Date; // Timestamp for when the user joined the challenge
}

// Define the type for the Challenge model
export interface IChallenge extends Document {
  title: string; // Title of the challenge
  description: string; // Description of what the challenge is about
  pointsRequired: number; // Number of points required to participate in the challenge
  rewardType: string; // Type of reward for the challenge (e.g., "badge", "discount", etc.)
  visibility: "public" | "private"; // Visibility of the challenge (public or private)
  participants: IParticipant[]; // Array of participants in the challenge
  status: "ongoing" | "completed"; // Status of the challenge (ongoing or completed)
  createdAt: Date; // Timestamp when the challenge was created
  updatedAt: Date; // Timestamp when the challenge was last updated
}

// Optional: Define a type for filters that might be used in querying challenges
export interface IChallengeFilters {
  status?: "ongoing" | "completed"; // Optional filter for the challenge status
  visibility?: "public" | "private"; // Optional filter for the challenge visibility
}
