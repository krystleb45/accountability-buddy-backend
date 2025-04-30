// src/api/services/RoleService.ts
import Role, { IRole } from "../models/Role";
import { createError } from "../middleware/errorHandler";
import { logger } from "../../utils/winstonLogger";

interface PredefinedRole {
  roleName: string;
  permissions: string[];
}

const PREDEFINED_ROLES: PredefinedRole[] = [
  { roleName: "admin",     permissions: ["manage_users", "view_analytics"] },
  { roleName: "moderator", permissions: ["view_analytics"] },
  { roleName: "user",      permissions: [] },
];

class RoleService {
  /**
   * Idempotently seed the predefined roles.
   */
  static async seedRoles(): Promise<IRole[]> {
    const seeded: IRole[] = [];
    for (const { roleName, permissions } of PREDEFINED_ROLES) {
      const existing = await Role.findOne({ roleName }).exec();
      if (!existing) {
        const created = await Role.create({ roleName, permissions });
        seeded.push(created);
      }
    }
    logger.info(`Seeded ${seeded.length} new roles`);
    return seeded;
  }

  /**
   * Fetch all roles.
   */
  static async listRoles(): Promise<IRole[]> {
    return Role.find().lean().exec();
  }

  /**
   * Update the permissions for a given role.
   */
  static async updateRole(
    roleId: string,
    permissions: string[]
  ): Promise<IRole> {
    if (!permissions || !Array.isArray(permissions)) {
      throw createError("Permissions must be an array", 400);
    }
    const updated = await Role.findByIdAndUpdate(
      roleId,
      { permissions },
      { new: true, runValidators: true }
    ).exec();
    if (!updated) {
      throw createError("Role not found", 404);
    }
    logger.info(`Updated role ${roleId} permissions`);
    return updated;
  }

  /**
   * Delete a role by ID.
   */
  static async deleteRole(roleId: string): Promise<void> {
    const deleted = await Role.findByIdAndDelete(roleId).exec();
    if (!deleted) {
      throw createError("Role not found", 404);
    }
    logger.info(`Deleted role ${roleId}`);
  }
}

export default RoleService;
