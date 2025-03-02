import jwt, { SignOptions } from "jsonwebtoken";
import ms, { StringValue } from "ms";

interface UserPayload {
  _id: string;
  role?: string;
}

// Default expiration times
const DEFAULT_ACCESS_TOKEN_EXPIRY = "1h";
const DEFAULT_REFRESH_TOKEN_EXPIRY = "7d";

/**
 * Converts expiration string to seconds safely
 * @param expiresIn Expiration string like "1h", "7d"
 */
const getExpirationInSeconds = (expiresIn: string): number => {
  const milliseconds = ms(expiresIn as StringValue);
  if (typeof milliseconds !== "number") {
    throw new Error(`Invalid expiration format: ${expiresIn}`);
  }
  return Math.floor(milliseconds / 1000); // Convert ms to seconds
};

/**
 * Generates a JWT token for authentication.
 */
export const generateToken = (
  user: UserPayload,
  expiresIn: string = DEFAULT_ACCESS_TOKEN_EXPIRY
): string => {
  if (!user || !user._id) {
    throw new Error("User object with a valid ID is required to generate a token.");
  }

  const payload = {
    userId: user._id,
    role: user.role || "user",
  };

  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }

  try {
    const options: SignOptions = { expiresIn: getExpirationInSeconds(expiresIn) };
    return jwt.sign(payload, secretKey, options);
  } catch (error) {
    throw new Error(`Failed to generate token: ${(error as Error).message}`);
  }
};

/**
 * Generates a JWT refresh token for session management.
 */
export const generateRefreshToken = (
  user: UserPayload,
  expiresIn: string = DEFAULT_REFRESH_TOKEN_EXPIRY
): string => {
  if (!user || !user._id) {
    throw new Error("User object with a valid ID is required to generate a refresh token.");
  }

  const payload = {
    userId: user._id,
    role: user.role || "user",
  };

  const refreshSecretKey = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecretKey) {
    throw new Error("JWT_REFRESH_SECRET is not defined in environment variables.");
  }

  try {
    const options: SignOptions = { expiresIn: getExpirationInSeconds(expiresIn) };
    return jwt.sign(payload, refreshSecretKey, options);
  } catch (error) {
    throw new Error(`Failed to generate refresh token: ${(error as Error).message}`);
  }
};

export default {
  generateToken,
  generateRefreshToken,
};
