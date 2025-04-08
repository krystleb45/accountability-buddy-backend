// AuthenticatedRequest.ts
import { Request } from "express";
import { IUser } from "./AuthenticatedUser";

export interface AuthenticatedRequest<P = {}, ResBody = any, ReqBody = any, ReqQuery = any>
  extends Omit<Request<P, ResBody, ReqBody, ReqQuery>, "user"> {
    user?: Partial<IUser>;
}

export interface AnalyticsRequestBody {
  startDate: string;
  endDate: string;
  metric: string;
}
