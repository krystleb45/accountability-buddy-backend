// src/api/controllers/RoleController.ts
import type { Request, Response, NextFunction } from "express";
import Role, { IRole } from "../models/Role";
import { logger } from "../../utils/winstonLogger";

/**
 * Seed predefined roles into the database (idempotent).
 */
export const seedRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const predefined: Array<{ roleName: string; permissions: string[] }> = [
      { roleName: "admin",     permissions: ["manage_users", "view_analytics"] },
      { roleName: "moderator", permissions: ["view_analytics"] },
      { roleName: "user",      permissions: [] },
    ];

    const seeded: IRole[] = [];
    for (const { roleName, permissions } of predefined) {
      const existing = await Role.findOne({ roleName });
      if (!existing) {
        const created = await Role.create({ roleName, permissions });
        seeded.push(created);
      }
    }

    res.status(201).json({ success: true, message: "Roles seeded", data: seeded });
  } catch (err) {
    logger.error("Error seeding roles", err);
    next(err);
  }
};

/**
 * Get all roles (Admin only).
 */
export const getAllRoles = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await Role.find().lean();
    res.status(200).json({ success: true, data: roles });
  } catch (err) {
    logger.error("Error fetching roles", err);
    next(err);
  }
};

/**
 * Update a role's permissions.
 */
export const updateRole = async (
  req: Request<{ id: string }, {}, { permissions: string[] }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const updated = await Role.findByIdAndUpdate(
      req.params.id,
      { permissions: req.body.permissions },
      { new: true, runValidators: true },
    );
    if (!updated) {
      res.status(404).json({ success: false, message: "Role not found" });
      return;
    }
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    logger.error("Error updating role", err);
    next(err);
  }
};

/**
 * Delete a role.
 */
export const deleteRole = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const deleted = await Role.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Role not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Role deleted" });
  } catch (err) {
    logger.error("Error deleting role", err);
    next(err);
  }
};
