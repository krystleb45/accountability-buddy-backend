// Represents a single chat message
export interface ChatMessage {
    message: string; // The content of the chat message
    groupId: string; // The ID of the group the message belongs to
    senderId: string; // The ID of the user who sent the message
    timestamp: Date; // The timestamp when the message was sent
  }
  
// Represents a response when sending a message
export interface SendMessageResponse {
    groupId: string; // The ID of the group the message was sent to
    messageId: string; // The ID of the newly created message
    status: string; // The status of the operation (e.g., "sent")
  }
  
// Represents a single chat group
export interface ChatGroup {
    groupId: string; // The ID of the group
    groupName: string; // The name of the group
    members: string[]; // Array of user IDs who are members of the group
  }
  
// Represents a response when creating a group
export interface CreatedGroup {
    groupName: string; // The name of the newly created group
    id: string; // The ID of the newly created group
  }
  
// Represents a single private chat between users
export interface PrivateChat {
    chatId: string; // The ID of the private chat
    userId: string; // The ID of the user involved in the private chat
  }
  
// Represents a single user group (used when fetching groups the user belongs to)
export interface UserGroup {
    groupId: string; // The ID of the group
    userId: string; // The ID of the user belonging to the group
  }
  
// Represents a response when adding a user to a group
export interface AddUserToGroupResponse {
    groupId: string; // The ID of the group the user was added to
    userId: string; // The ID of the user who was added to the group
    status: string; // The status of the operation (e.g., "added")
  }
  