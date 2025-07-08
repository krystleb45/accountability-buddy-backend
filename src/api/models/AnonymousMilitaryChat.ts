// src/api/models/AnonymousMilitaryChat.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IAnonymousMilitaryMessage extends Document {
  room: string;                    // 'veterans-support', 'active-duty', 'family-members'
  anonymousSessionId: string;      // Temporary session ID
  displayName: string;             // Generated anonymous name
  message: string;                 // Message content
  isFlagged: boolean;             // Crisis/inappropriate content detection
  createdAt: Date;
}

export interface IAnonymousSession extends Document {
  sessionId: string;              // Unique session identifier
  displayName: string;            // Generated name
  room: string;                   // Current room
  lastActive: Date;               // For cleanup
  joinedAt: Date;
}

// Anonymous Message Schema (24-hour auto-deletion for privacy)
const AnonymousMilitaryMessageSchema = new Schema({
  room: {
    type: String,
    required: true,
    enum: ["veterans-support", "active-duty", "family-members"]
  },
  anonymousSessionId: {
    type: String,
    required: true,
    index: true
  },
  displayName: {
    type: String,
    required: true,
    maxlength: 50
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  isFlagged: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  // Auto-delete after 24 hours for privacy
  expires: 86400
});

// Index for efficient queries
AnonymousMilitaryMessageSchema.index({ room: 1, createdAt: -1 });

// Anonymous Session Schema (1-hour auto-cleanup)
const AnonymousSessionSchema = new Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  displayName: {
    type: String,
    required: true,
    maxlength: 50
  },
  room: {
    type: String,
    required: true,
    enum: ["veterans-support", "active-duty", "family-members"]
  },
  lastActive: {
    type: Date,
    default: Date.now,
    index: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  // Auto-delete after 1 hour of inactivity
  expires: 3600
});

export const AnonymousMilitaryMessage = mongoose.model<IAnonymousMilitaryMessage>("AnonymousMilitaryMessage", AnonymousMilitaryMessageSchema);
export const AnonymousSession = mongoose.model<IAnonymousSession>("AnonymousSession", AnonymousSessionSchema);
