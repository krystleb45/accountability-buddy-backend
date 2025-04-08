// src/types/AdminAuthenticatedRequest.ts
import { AuthenticatedRequest } from "./AuthenticatedRequest";
import { IUser } from "../api/models/User";

export type AdminAuthenticatedRequest<
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Record<string, any>
> = Omit<AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>, "user"> & {
  user: IUser;
};
