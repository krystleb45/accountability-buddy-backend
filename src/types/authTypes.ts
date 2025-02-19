export interface IAuthToken {
    userId: string;
    role: "user" | "admin" | "moderator";
    issuedAt: number;
    expiresAt: number;
  }
  
export interface ILoginPayload {
    email: string;
    password: string;
  }
  
export interface IAuthResponse {
    token: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      role: "user" | "admin" | "moderator";
    };
  }
  