import type { JwtPayload, SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";

interface TokenPayload extends JwtPayload {
  id: string;
  email: string;
  [key: string]: unknown; // Add additional fields as needed
}

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "default_refresh_secret";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * Generate an access token.
 *
 * @param payload - The payload to include in the token.
 * @returns The signed JWT.
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined.");
  }

  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as SignOptions);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Error generating access token: ${errorMessage}`);
  }
};

/**
 * Generate a refresh token.
 *
 * @param payload - The payload to include in the token.
 * @returns The signed refresh token.
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  if (!JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not defined.");
  }

  try {
    return jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
    } as SignOptions);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Error generating refresh token: ${errorMessage}`);
  }
};

/**
 * Verify an access token.
 *
 * @param token - The token to verify.
 * @returns The decoded payload if the token is valid.
 * @throws Error if the token is invalid or verification fails.
 */
export const verifyJWT = (token: string): TokenPayload => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined.");
  }

  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`JWT verification failed: ${errorMessage}`);
  }
};

/**
 * Verify a refresh token.
 *
 * @param token - The refresh token to verify.
 * @returns The decoded payload if the token is valid.
 * @throws Error if the token is invalid or verification fails.
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  if (!JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not defined.");
  }

  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Refresh token verification failed: ${errorMessage}`);
  }
};

/**
 * Decode a token without verification.
 *
 * @param token - The token to decode.
 * @returns The decoded payload or null if decoding fails.
 */
export const decodeJWT = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.decode(token);
    return decoded as JwtPayload | null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`JWT decoding failed: ${errorMessage}`);
  }
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyJWT,
  verifyRefreshToken,
  decodeJWT,
};
