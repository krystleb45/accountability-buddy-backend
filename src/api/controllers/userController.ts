// src/api/controllers/userController.ts
import type { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import UserService from "../services/UserService";

export const getUserProfile = catchAsync(async (req: Request, res: Response) => {
  const user = await UserService.getUserById(req.user!.id);
  sendResponse(res, 200, true, "User profile fetched", { user });
});

export const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  await UserService.updatePassword(req.user!.id, currentPassword, newPassword);
  sendResponse(res, 200, true, "Password updated successfully");
});

export const deleteUserAccount = catchAsync(async (req: Request, res: Response) => {
  await UserService.deleteUser(req.user!.id);
  sendResponse(res, 200, true, "Account deleted successfully");
});

export const getLeaderboard = catchAsync(async (req: Request, res: Response) => {
  const leaderboard = await UserService.getLeaderboard({
    sortBy: req.query.sortBy as any,
    timeRange: req.query.timeRange as any,
  });
  sendResponse(res, 200, true, "Leaderboard fetched", { leaderboard });
});

export const pinGoal = catchAsync(async (req: Request, res: Response) => {
  const pinnedGoals = await UserService.pinGoal(req.user!.id, req.body.goalId);
  sendResponse(res, 200, true, "Goal pinned", { pinnedGoals });
});

export const unpinGoal = catchAsync(async (req: Request, res: Response) => {
  const pinnedGoals = await UserService.unpinGoal(req.user!.id, req.body.goalId);
  sendResponse(res, 200, true, "Goal unpinned", { pinnedGoals });
});

export const getPinnedGoals = catchAsync(async (req: Request, res: Response) => {
  const pinnedGoals = await UserService.getPinnedGoals(req.user!.id);
  sendResponse(res, 200, true, "Pinned goals fetched", { pinnedGoals });
});

export const featureAchievement = catchAsync(async (req: Request, res: Response) => {
  const featured = await UserService.featureAchievement(req.user!.id, req.body.achievementId);
  sendResponse(res, 200, true, "Achievement featured", { featured });
});

export const unfeatureAchievement = catchAsync(async (req: Request, res: Response) => {
  const featured = await UserService.unfeatureAchievement(req.user!.id, req.body.achievementId);
  sendResponse(res, 200, true, "Achievement unfeatured", { featured });
});

export const getFeaturedAchievements = catchAsync(async (req: Request, res: Response) => {
  const featured = await UserService.getFeaturedAchievements(req.user!.id);
  sendResponse(res, 200, true, "Featured achievements fetched", { featured });
});

export const fetchAllUsers = catchAsync(async (_req: Request, res: Response) => {
  const { users, total, totalPages } = await UserService.getAllUsers();
  sendResponse(res, 200, true, "All users fetched", { users, total, totalPages });
});

export const blockUser = catchAsync(async (req: Request, res: Response) => {
  const user = await UserService.blockUser(req.params.userId);
  sendResponse(res, 200, true, "User blocked", { user });
});

export const unblockUser = catchAsync(async (req: Request, res: Response) => {
  const user = await UserService.unblockUser(req.params.userId);
  sendResponse(res, 200, true, "User unblocked", { user });
});

export const fetchBadges = catchAsync(async (_req: Request, res: Response) => {
  const badges = await UserService.fetchBadges();
  sendResponse(res, 200, true, "Badges fetched", { badges });
});

export const fetchUserBadges = catchAsync(async (req: Request, res: Response) => {
  const badges = await UserService.fetchUserBadges(req.params.userId);
  sendResponse(res, 200, true, "User badges fetched", { badges });
});

export const awardBadge = catchAsync(async (req: Request, res: Response) => {
  const badges = await UserService.awardBadge(req.body.userId, req.body.badgeId);
  sendResponse(res, 200, true, "Badge awarded", { badges });
});

export const getUserStatistics = catchAsync(async (req: Request, res: Response) => {
  const stats = await UserService.getStatistics(req.params.userId);
  sendResponse(res, 200, true, "User statistics fetched", { stats });
});

export default {
  getUserProfile,
  changePassword,
  deleteUserAccount,
  getLeaderboard,
  pinGoal,
  unpinGoal,
  getPinnedGoals,
  featureAchievement,
  unfeatureAchievement,
  getFeaturedAchievements,
  fetchAllUsers,
  blockUser,
  unblockUser,
  fetchBadges,
  fetchUserBadges,
  awardBadge,
  getUserStatistics,
};
