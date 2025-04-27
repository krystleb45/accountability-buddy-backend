// src/api/routes/roles.ts
import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import { roleBasedAccessControl } from "../middleware/roleBasedAccessControl";
import rateLimit from "express-rate-limit";
import * as RoleCtrl from "../controllers/RoleController";

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many requests. Please try again later.",
});

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Manage user roles and permissions
 */

/**
 * @swagger
 * /api/roles/seed:
 *   post:
 *     summary: Seed predefined roles into the database
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Roles seeded successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.post(
  "/seed",
  protect,
  roleBasedAccessControl(["admin"]),
  limiter,
  RoleCtrl.seedRoles
);

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get(
  "/",
  protect,
  roleBasedAccessControl(["admin"]),
  limiter,
  RoleCtrl.getAllRoles
);

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Update a role's permissions
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permissions
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  protect,
  roleBasedAccessControl(["admin"]),
  limiter,
  RoleCtrl.updateRole
);

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  protect,
  roleBasedAccessControl(["admin"]),
  limiter,
  RoleCtrl.deleteRole
);

export default router;
