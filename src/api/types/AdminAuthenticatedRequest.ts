// src/types/AdminAuthenticatedRequest.ts
import { AuthenticatedRequest } from "./AuthenticatedRequest";
import { IUser } from "../models/User"; // Use your unified IUser here

export type AdminAuthenticatedRequest<
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Record<string, any>
> = Omit<AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>, "user"> & {
  user: IUser;
};
