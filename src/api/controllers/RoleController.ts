import type { Request, Response, NextFunction } from "express";
import RoleService from "../services/RoleService";
import sendResponse from "../utils/sendResponse";

export const seedRoles = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const seeded = await RoleService.seedRoles();
    sendResponse(res, 201, true, "Roles seeded", { seeded });
  } catch (err) {
    next(err);
  }
};

export const getAllRoles = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await RoleService.listRoles();
    sendResponse(res, 200, true, "Roles fetched", { roles });
  } catch (err) {
    next(err);
  }
};

export const updateRole = async (
  req: Request<{ id: string }, {}, { permissions: string[] }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const updated = await RoleService.updateRole(req.params.id, req.body.permissions);
    sendResponse(res, 200, true, "Role updated", { role: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteRole = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    await RoleService.deleteRole(req.params.id);
    sendResponse(res, 200, true, "Role deleted");
  } catch (err) {
    next(err);
  }
};
