export interface IMessageEvent {
    senderId: string;
    receiverId: string;
    content: string;
    sentAt: Date;
  }
  
export interface INotificationEvent {
    userId: string;
    message: string;
    createdAt: Date;
  }
  