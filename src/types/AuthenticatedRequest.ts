import type { Request } from "express";

export interface AuthenticatedUser {
  id: string; // User ID
  email?: string; // Optional email
  role: "user" | "admin" | "moderator"; // User role
  isAdmin?: boolean; // Whether the user has admin privileges
  permissions?: string[]; // Optional permissions field
  password?(currentPassword: any, password: any): unknown; // Optional password method
}

// ✅ Define Request Body for Analytics
export interface AnalyticsRequestBody {
  startDate: string;
  endDate: string;
  metric: string;
}

// ✅ Use `extends Request` for full Express compatibility
export interface AuthenticatedRequest<
  Params = {}, 
  ResBody = any, 
  ReqBody = {}, 
  ReqQuery = {}
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user: AuthenticatedUser;
  body: ReqBody;
}
