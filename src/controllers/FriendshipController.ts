import type { Request, Response } from "express";
import User from "../models/User";
import FriendRequest from "../models/FriendRequest";
import Chat from "../models/Chat";
import Notification from "../models/Notification";
import catchAsync from "../utils/catchAsync";
import sendResponse from "../utils/sendResponse";
import logger from "../utils/winstonLogger";

export const sendFriendRequest = catchAsync(
  async (
    req: Request<{}, any, { recipientId: string }>,
    res: Response
  ): Promise<void> => {
    const senderId = req.user?.id;
    const { recipientId } = req.body;

    if (!senderId || !recipientId) {
      sendResponse(res, 400, false, "Both sender and recipient IDs are required.");
      return;
    }

    if (senderId === recipientId) {
      sendResponse(res, 400, false, "You cannot send a friend request to yourself.");
      return;
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      sendResponse(res, 404, false, "Recipient user not found.");
      return;
    }

    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, recipient: recipientId },
        { sender: recipientId, recipient: senderId },
      ],
    });

    if (existingRequest) {
      sendResponse(res, 400, false, "A friend request already exists between these users.");
      return;
    }

    await FriendRequest.create({
      sender: senderId,
      recipient: recipientId,
      status: "pending",
    });

    await Notification.create({
      user: recipientId,
      message: `You received a friend request from ${senderId}`,
      type: "info",
      read: false,
      link: "/friends/requests",
    });

    logger.info(`Friend request sent from ${senderId} to ${recipientId}`);
    sendResponse(res, 201, true, "Friend request sent successfully.");
  }
);

export const acceptFriendRequest = catchAsync(
  async (
    req: Request<{}, any, { requestId: string }>,
    res: Response
  ): Promise<void> => {
    const userId = req.user?.id;
    const { requestId } = req.body;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      sendResponse(res, 404, false, "Friend request not found.");
      return;
    }

    if (friendRequest.recipient.toString() !== userId) {
      sendResponse(res, 403, false, "Unauthorized to accept this friend request.");
      return;
    }

    friendRequest.status = "accepted";
    await friendRequest.save();

    const senderId = friendRequest.sender.toString();

    await User.findByIdAndUpdate(userId, { $push: { friends: senderId } });
    await User.findByIdAndUpdate(senderId, { $push: { friends: userId } });

    await Chat.create({
      participants: [userId, senderId],
      chatType: "private",
      messages: [],
    });

    await Notification.create([
      {
        user: senderId,
        message: `${userId} accepted your friend request.`,
        type: "success",
        read: false,
        link: "/friends",
      },
      {
        user: userId,
        message: `You are now friends with ${senderId}.`,
        type: "success",
        read: false,
        link: "/friends",
      }
    ]);

    logger.info(`Friend request accepted: ${userId} & ${senderId} are now friends.`);
    sendResponse(res, 200, true, "Friend request accepted.");
  }
);

export const getFriendsList = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const user = await User.findById(userId).populate("friends", "username email profilePicture");
  if (!user) {
    sendResponse(res, 404, false, "User not found");
    return;
  }
  sendResponse(res, 200, true, "Friends list retrieved successfully", { friends: user.friends });
});

export const getPendingFriendRequests = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const requests = await FriendRequest.find({ recipient: userId, status: "pending" }).populate("sender", "username email profilePicture");
  sendResponse(res, 200, true, "Pending friend requests retrieved successfully", { requests });
});

export const cancelFriendRequest = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { requestId } = req.params;
  const friendRequest = await FriendRequest.findOne({ _id: requestId, sender: userId });
  if (!friendRequest) {
    sendResponse(res, 404, false, "Friend request not found or not yours to cancel");
    return;
  }
  await friendRequest.deleteOne();
  sendResponse(res, 200, true, "Friend request canceled successfully");
});

export const removeFriend = catchAsync(
  async (req: Request<{ friendId: string }>, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { friendId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      sendResponse(res, 404, false, "User not found.");
      return;
    }

    const friend = await User.findById(friendId);
    if (!friend) {
      sendResponse(res, 404, false, "Friend not found.");
      return;
    }

    user.friends = user.friends.filter((id) => id.toString() !== friendId);
    friend.friends = friend.friends.filter((id) => id.toString() !== userId);

    await user.save();
    await friend.save();

    await Notification.create({
      user: friendId,
      message: `${userId} removed you as a friend.`,
      type: "alert",
      read: false,
      link: "/friends",
    });

    logger.info(`Friendship removed: ${userId} & ${friendId}`);
    sendResponse(res, 200, true, "Friend removed successfully.");
  }
);