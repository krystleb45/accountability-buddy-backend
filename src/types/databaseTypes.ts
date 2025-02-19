export interface IUser {
    id: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
export interface IPost {
    id: string;
    title: string;
    content: string;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
  }
  