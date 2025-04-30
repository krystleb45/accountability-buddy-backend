// src/api/services/FriendService.ts
import mongoose from "mongoose";
import Follow from "../models/Follow";
import FriendRequest, { IFriendRequest } from "../models/FriendRequest";
import { User, IUser } from "../models/User";
import Notification from "../models/Notification";
import { createError } from "../middleware/errorHandler";

type Follower = { id: string; name: string; avatarUrl?: string };
type Following = Follower;
type FriendDoc = IUser;

const FriendService = {
  // ─── FOLLOWS ─────────────────────────────────────────

  async follow(userId: string, targetId: string): Promise<void> {
    if (!mongoose.isValidObjectId(targetId)) throw createError("Invalid target user ID", 400);
    if (userId === targetId) throw createError("Cannot follow yourself", 400);

    const exists = await Follow.findOne({ user: userId, targetUser: targetId });
    if (exists) return;

    await Follow.create({ user: userId, targetUser: targetId });
    await Notification.create({
      user: targetId,
      message: `User ${userId} started following you.`,
      type: "info",
      read: false,
      link: `/users/${userId}`,
    });
  },

  async unfollow(userId: string, targetId: string): Promise<void> {
    if (!mongoose.isValidObjectId(targetId)) throw createError("Invalid target user ID", 400);
    await Follow.deleteOne({ user: userId, targetUser: targetId });
  },

  async getFollowers(userId: string): Promise<Follower[]> {
    if (!mongoose.isValidObjectId(userId)) throw createError("Invalid user ID", 400);

    const docs = await Follow.find({ targetUser: userId })
      .populate<{ user: IUser & mongoose.Document }>(
        "user",
        "username profilePicture"
      );

    return docs.map(d => ({
      id: d.user._id.toString(),
      name: d.user.username,
      avatarUrl: d.user.profilePicture,      // <-- use profilePicture
    }));
  },

  async getFollowing(userId: string): Promise<Following[]> {
    if (!mongoose.isValidObjectId(userId)) throw createError("Invalid user ID", 400);

    const docs = await Follow.find({ user: userId })
      .populate<{ targetUser: IUser & mongoose.Document }>(
        "targetUser",
        "username profilePicture"
      );

    return docs.map(d => ({
      id: d.targetUser._id.toString(),
      name: d.targetUser.username,
      avatarUrl: d.targetUser.profilePicture, // <-- use profilePicture
    }));
  },

  // ─── FRIEND REQUESTS ─────────────────────────────────

  async sendRequest(senderId: string, recipientId: string): Promise<void> {
    if (!mongoose.isValidObjectId(recipientId)) throw createError("Invalid recipient ID", 400);
    if (senderId === recipientId) throw createError("Cannot friend yourself", 400);

    const exists = await FriendRequest.findOne<IFriendRequest>({
      $or: [
        { sender: senderId, recipient: recipientId },
        { sender: recipientId, recipient: senderId },
      ],
    });
    if (exists) throw createError("Request already exists", 400);

    await FriendRequest.create({ sender: senderId, recipient: recipientId, status: "pending" });
    await Notification.create({
      user: recipientId,
      message: `User ${senderId} sent you a friend request.`,
      type: "info",
      read: false,
      link: "/friends/requests",
    });
  },

  async acceptRequest(requestId: string, userId: string): Promise<void> {
    if (!mongoose.isValidObjectId(requestId)) throw createError("Invalid request ID", 400);

    const reqDoc = await FriendRequest.findById<IFriendRequest & mongoose.Document>(requestId);
    if (!reqDoc) throw createError("Friend request not found", 404);
    if (reqDoc.recipient.toString() !== userId) throw createError("Not allowed", 403);

    reqDoc.status = "accepted";
    await reqDoc.save();

    const other = reqDoc.sender.toString();
    await User.findByIdAndUpdate(userId, { $push: { friends: other } });
    await User.findByIdAndUpdate(other, { $push: { friends: userId } });

    // Create private chat
    await mongoose.model("Chat").create({
      participants: [userId, other],
      chatType: "private",
      messages: [],
    });

    await Notification.create([
      {
        user: other,
        message: `${userId} accepted your friend request.`,
        type: "success",
        read: false,
        link: "/friends",
      },
      {
        user: userId,
        message: `You are now friends with ${other}.`,
        type: "success",
        read: false,
        link: "/friends",
      },
    ]);
  },

  async rejectRequest(requestId: string, userId: string): Promise<void> {
    if (!mongoose.isValidObjectId(requestId)) throw createError("Invalid request ID", 400);

    const reqDoc = await FriendRequest.findById<IFriendRequest & mongoose.Document>(requestId);
    if (!reqDoc) throw createError("Friend request not found", 404);
    if (reqDoc.recipient.toString() !== userId) throw createError("Not allowed", 403);

    reqDoc.status = "rejected";
    await reqDoc.save();

    await Notification.create({
      user: reqDoc.sender.toString(),
      message: `${userId} rejected your friend request.`,
      type: "alert",
      read: false,
      link: "/friends",
    });
  },

  async cancelRequest(requestId: string, userId: string): Promise<void> {
    if (!mongoose.isValidObjectId(requestId)) throw createError("Invalid request ID", 400);

    const result = await FriendRequest.deleteOne({ _id: requestId, sender: userId });
    if (!result.deletedCount) throw createError("Request not found or not yours", 404);
  },

  async removeFriend(userId: string, friendId: string): Promise<void> {
    if (!mongoose.isValidObjectId(friendId)) throw createError("Invalid friend ID", 400);

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);
    if (!user || !friend) throw createError("User not found", 404);

    user.friends = user.friends.filter(id => id.toString() !== friendId);
    friend.friends = friend.friends.filter(id => id.toString() !== userId);
    await user.save();
    await friend.save();

    await Notification.create({
      user: friendId,
      message: `${userId} removed you as a friend.`,
      type: "alert",
      read: false,
      link: "/friends",
    });
  },

  async listFriends(userId: string): Promise<FriendDoc[]> {
    if (!mongoose.isValidObjectId(userId)) throw createError("Invalid user ID", 400);

    const user = await User.findById(userId)
      .populate("friends", "username email profilePicture");

    if (!user) throw createError("User not found", 404);

    // Cast from ObjectId[] to IUser[] since we've populated
    return (user.friends as unknown as FriendDoc[]);
  },

  async pendingRequests(userId: string): Promise<(IFriendRequest & { sender: IUser })[]> {
    if (!mongoose.isValidObjectId(userId)) throw createError("Invalid user ID", 400);

    return FriendRequest.find({ recipient: userId, status: "pending" })
      .populate<IFriendRequest & { sender: IUser }>("sender", "username email profilePicture");
  },

  async aiRecommendations(_userId: string): Promise<IUser[]> {
    // stub: replace with your ML logic
    return User.find({ interests: { $in: ["Fitness", "Music"] } })
      .select("username email profilePicture")
      .limit(5);
  },
};

export default FriendService;
