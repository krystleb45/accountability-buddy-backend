import { Request } from "express";

export interface AuthenticatedRequest<P = {}, ResBody = {}, ReqBody = {}> extends Request<P, ResBody, ReqBody> {
  user?: {
    id: string;
    email?: string;
    role: "user" | "admin" | "moderator";
    isAdmin?: boolean;
    subscription_status?: "active" | "trial" | "expired";
  };
}