import type { Request } from "express";

export interface AuthenticatedRequest<
  Params = {}, // URL parameters
  ResBody = any, // Response body
  ReqBody = {}, // Request body
  ReqQuery = {} // Query parameters
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string; // User ID
    email?: string; // Optional email
    role: "user" | "admin" | "moderator"; // User role
    isAdmin?: boolean; // Whether the user has admin privileges
    password?(currentPassword: any, password: any): unknown; // Optional password method
  };
  body: ReqBody & {
    permissions?: string[]; // Optional permissions field in the request body
  };
}
