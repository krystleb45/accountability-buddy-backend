// types/AdminRequest.ts
import { AuthenticatedRequest } from "./AuthenticatedRequest";
import { IUser } from "../api/models/User"; // adjust the path as needed

export type AdminRequest<
  P = Record<string, string>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Record<string, any>
> = Omit<AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>, "user"> & {
  user?: Partial<IUser>;
};
