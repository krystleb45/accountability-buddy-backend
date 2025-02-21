import { Request } from "express";

export interface AuthenticatedRequest<P = {}, ResBody = {}, ReqBody = {}> extends Request<P, ResBody, ReqBody> {
  user?: { id: string }; // Ensure user ID is attached after authentication
}
