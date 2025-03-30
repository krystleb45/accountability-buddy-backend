import { User } from "../models/User";
import FriendRequest from "../models/FriendRequest";
import NotificationService from "./NotificationService";
import { logger } from "../../utils/winstonLogger";

// Function to check if two users are already friends
const areUsersFriends = async (userId: string, friendId: string): Promise<boolean> => {
  const user = await User.findById(userId).populate("friends");
  if (!user) throw new Error("User not found");

  return user.friends.some((friend: any) => friend._id.toString() === friendId);
};

// Function to send a friend request
const sendFriendRequest = async (senderId: string, recipientId: string): Promise<void> => {
  // Check if the users are already friends
  const areFriends = await areUsersFriends(senderId, recipientId);
  if (areFriends) throw new Error("You are already friends with this user");

  // Check if a request already exists
  const existingRequest = await FriendRequest.findOne({
    $or: [
      { sender: senderId, recipient: recipientId },
      { sender: recipientId, recipient: senderId },
    ],
  });

  if (existingRequest) throw new Error("A friend request already exists between these users");

  // Create a new friend request
  const friendRequest = await FriendRequest.create({
    sender: senderId,
    recipient: recipientId,
    status: "pending",
  });
  
  logger.info(`Friend request created with ID ${friendRequest._id}`);

  // Notify the recipient about the friend request
  await NotificationService.sendInAppNotification(recipientId, `${senderId} sent you a friend request`);

  logger.info(`Friend request sent from ${senderId} to ${recipientId}`);
};

// Function to accept a friend request
const acceptFriendRequest = async (requestId: string, userId: string): Promise<void> => {
  const friendRequest = await FriendRequest.findById(requestId);

  if (!friendRequest) throw new Error("Friend request not found");

  if (friendRequest.recipient.toString() !== userId) throw new Error("Unauthorized to accept this request");

  friendRequest.status = "accepted";
  await friendRequest.save();

  const senderId = friendRequest.sender.toString();

  // Add the sender and recipient to each other's friends list
  await User.findByIdAndUpdate(userId, { $push: { friends: senderId } });
  await User.findByIdAndUpdate(senderId, { $push: { friends: userId } });

  // Send notifications about the acceptance
  await NotificationService.sendInAppNotification(senderId, `${userId} accepted your friend request`);
  await NotificationService.sendInAppNotification(userId, `You are now friends with ${senderId}`);

  logger.info(`Friend request accepted: ${userId} & ${senderId} are now friends`);
};

// Function to reject a friend request
const rejectFriendRequest = async (requestId: string, userId: string): Promise<void> => {
  const friendRequest = await FriendRequest.findById(requestId);

  if (!friendRequest) throw new Error("Friend request not found");

  if (friendRequest.recipient.toString() !== userId) throw new Error("Unauthorized to reject this request");

  friendRequest.status = "declined";
  await friendRequest.save();

  // Send rejection notification
  const senderId = friendRequest.sender.toString();
  await NotificationService.sendInAppNotification(senderId, `${userId} rejected your friend request`);

  logger.info(`Friend request rejected: ${userId} rejected the request from ${senderId}`);
};

// Function to cancel a friend request
const cancelFriendRequest = async (requestId: string, userId: string): Promise<void> => {
  const friendRequest = await FriendRequest.findOne({ _id: requestId, sender: userId });

  if (!friendRequest) throw new Error("Friend request not found or not yours to cancel");

  await friendRequest.deleteOne();

  logger.info(`Friend request canceled: ${userId} canceled the request`);
};

// Function to remove a friend
const removeFriend = async (userId: string, friendId: string): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const friend = await User.findById(friendId);
  if (!friend) throw new Error("Friend not found");

  user.friends = user.friends.filter((id) => id.toString() !== friendId);
  friend.friends = friend.friends.filter((id) => id.toString() !== userId);

  await user.save();
  await friend.save();

  // Notify the friend about removal
  await NotificationService.sendInAppNotification(friendId, `${userId} removed you as a friend`);

  logger.info(`Friendship removed: ${userId} & ${friendId}`);
};

export default {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
};
