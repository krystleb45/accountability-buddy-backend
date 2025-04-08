import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import XpHistory from "../models/XpHistory";

/**
 * @swagger
 * tags:
 *   name: XP History
 *   description: API for managing user XP history entries
 */

/**
 * @swagger
 * /api/xp-history/{userId}:
 *   get:
 *     summary: Fetch XP history for a user
 *     tags: [XP History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the user
 *     responses:
 *       200:
 *         description: XP history fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     xpHistory:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/XpHistory'
 *       404:
 *         description: No XP history found
 */
export const getXpHistory = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  const xpHistory = await XpHistory.find({ userId }).sort({ date: -1 });

  if (!xpHistory || xpHistory.length === 0) {
    sendResponse(res, 404, false, "No XP history found for this user.");
    return;
  }

  sendResponse(res, 200, true, "XP history fetched successfully", { xpHistory });
});

/**
 * @swagger
 * /api/xp-history:
 *   post:
 *     summary: Create a new XP history entry
 *     tags: [XP History]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: XP history payload
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - xp
 *               - date
 *             properties:
 *               userId:
 *                 type: string
 *               xp:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: XP history created successfully
 *       400:
 *         description: Missing required fields
 */
export const createXpHistory = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { userId, xp, date } = req.body;

  if (!userId || xp == null || !date) {
    sendResponse(res, 400, false, "User ID, XP, and date are required.");
    return;
  }

  const newXpHistory = await XpHistory.create({ userId, xp, date });

  sendResponse(res, 201, true, "XP history created successfully", { xpHistory: newXpHistory });
});

/**
 * @swagger
 * /api/xp-history/{id}:
 *   delete:
 *     summary: Delete an XP history entry by ID
 *     tags: [XP History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: XP history entry ID
 *     responses:
 *       200:
 *         description: XP history entry deleted successfully
 *       404:
 *         description: XP history entry not found
 */
export const deleteXpHistory = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const xpHistory = await XpHistory.findById(id);
  if (!xpHistory) {
    sendResponse(res, 404, false, "XP history entry not found.");
    return;
  }

  await XpHistory.deleteOne({ _id: id });

  sendResponse(res, 200, true, "XP history entry deleted successfully");
});

export default {
  getXpHistory,
  createXpHistory,
  deleteXpHistory,
};
