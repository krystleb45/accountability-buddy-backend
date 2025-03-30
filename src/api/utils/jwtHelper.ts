import type { JwtPayload, SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";

// Default expiration times
const DEFAULT_ACCESS_TOKEN_EXPIRY = "1h";
const DEFAULT_REFRESH_TOKEN_EXPIRY = "7d";

interface TokenPayload extends JwtPayload {
  id: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

/**
 * Generates a JWT access token.
 * @param payload - The payload to include in the token (e.g., user ID, role).
 * @param expiresIn - Expiration duration for the token (default is '1h').
 * @returns The signed JWT access token.
 * @throws Error if `JWT_SECRET` is not defined or token generation fails.
 */
export const generateAccessToken = (
  payload: TokenPayload,
  expiresIn: string = DEFAULT_ACCESS_TOKEN_EXPIRY,
): string => {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }

  try {
    return jwt.sign(payload, secretKey, { expiresIn } as SignOptions);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to generate access token: ${errorMessage}`);
  }
};

/**
 * Generates a JWT refresh token.
 * @param payload - The payload to include in the token (e.g., user ID, role).
 * @param expiresIn - Expiration duration for the refresh token (default is '7d').
 * @returns The signed JWT refresh token.
 * @throws Error if `JWT_REFRESH_SECRET` is not defined or token generation fails.
 */
export const generateRefreshToken = (
  payload: TokenPayload,
  expiresIn: string = DEFAULT_REFRESH_TOKEN_EXPIRY,
): string => {
  const refreshSecretKey = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecretKey) {
    throw new Error("JWT_REFRESH_SECRET is not defined in environment variables.");
  }

  try {
    return jwt.sign(payload, refreshSecretKey, { expiresIn } as SignOptions);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to generate refresh token: ${errorMessage}`);
  }
};

/**
 * Verifies a JWT access token and returns the decoded payload.
 * @param token - The JWT token to verify.
 * @returns The decoded token payload.
 * @throws Error if token verification fails.
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }

  try {
    return jwt.verify(token, secretKey) as TokenPayload;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to verify access token: ${errorMessage}`);
  }
};

/**
 * Verifies a JWT refresh token and returns the decoded payload.
 * @param refreshToken - The JWT refresh token to verify.
 * @returns The decoded refresh token payload.
 * @throws Error if token verification fails.
 */
export const verifyRefreshToken = (refreshToken: string): TokenPayload => {
  const refreshSecretKey = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecretKey) {
    throw new Error("JWT_REFRESH_SECRET is not defined in environment variables.");
  }

  try {
    return jwt.verify(refreshToken, refreshSecretKey) as TokenPayload;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to verify refresh token: ${errorMessage}`);
  }
};

/**
 * Decodes a JWT token without verifying its signature.
 * @param token - The JWT token to decode.
 * @returns The decoded token payload or null if decoding fails.
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload | null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to decode token: ${errorMessage}`);
  }
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};
