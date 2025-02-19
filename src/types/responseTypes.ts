export interface SuccessResponse<T> {
    success: true;
    data: T;
  }
  
export interface ErrorResponse {
    success: false;
    error: {
      message: string;
      code?: number;
    };
  }
  