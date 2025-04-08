// types/MilitarySupport.ts

import type { Types } from "mongoose";

/**
 * Military Support Resource (external links like hotlines, websites)
 */
export interface IMilitaryResource {
  _id?: Types.ObjectId;
  title: string;
  url: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Military Support Chatroom (group chat for military users)
 */
export interface IMilitaryChatroom {
  _id?: Types.ObjectId;
  name: string;
  description: string;
  members: Types.ObjectId[] | string[]; // Can be ObjectId or plain string
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Military Chat Message (individual message within a military chatroom)
 */
export interface IMilitaryMessage {
  _id?: Types.ObjectId;
  user: Types.ObjectId | string;
  text: string;
  timestamp?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
