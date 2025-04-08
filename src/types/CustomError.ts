// src/types/CustomError.ts

export interface CustomError extends Error {
    statusCode?: number;
    details?: any;
  }
  