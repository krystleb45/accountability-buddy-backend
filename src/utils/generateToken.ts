import jwt from "jsonwebtoken";

interface UserPayload {
  _id: string;
  role?: string;
}

// Default expiration times
const DEFAULT_ACCESS_TOKEN_EXPIRY = "1h";
const DEFAULT_REFRESH_TOKEN_EXPIRY = "7d";

/**
 * Generates a JWT token for authentication.
 * @param {UserPayload} user - The user object (must include _id).
 * @param {string} [expiresIn=DEFAULT_ACCESS_TOKEN_EXPIRY] - Expiration duration for the token.
 * @returns {string} - Signed JWT token.
 * @throws {Error} - Throws error if the user object is invalid or JWT_SECRET is not defined.
 */
export const generateToken = (
  user: UserPayload,
  expiresIn: string = DEFAULT_ACCESS_TOKEN_EXPIRY,
): string => {
  if (!user || !user._id) {
    throw new Error(
      "User object with a valid ID is required to generate a token.",
    );
  }

  const payload = {
    userId: user._id,
    role: user.role || "user", // Default to 'user' role if not provided
  };

  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }

  try {
    return jwt.sign(payload, secretKey, { expiresIn });
  } catch (error) {
    throw new Error(`Failed to generate token: ${(error as Error).message}`);
  }
};

/**
 * Generates a JWT refresh token for session management.
 * @param {UserPayload} user - The user object (must include _id).
 * @param {string} [expiresIn=DEFAULT_REFRESH_TOKEN_EXPIRY] - Expiration duration for the refresh token.
 * @returns {string} - Signed JWT refresh token.
 * @throws {Error} - Throws error if the user object is invalid or JWT_REFRESH_SECRET is not defined.
 */
export const generateRefreshToken = (
  user: UserPayload,
  expiresIn: string = DEFAULT_REFRESH_TOKEN_EXPIRY,
): string => {
  if (!user || !user._id) {
    throw new Error(
      "User object with a valid ID is required to generate a refresh token.",
    );
  }

  const payload = {
    userId: user._id,
    role: user.role || "user",
  };

  const refreshSecretKey = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecretKey) {
    throw new Error(
      "JWT_REFRESH_SECRET is not defined in environment variables.",
    );
  }

  try {
    return jwt.sign(payload, refreshSecretKey, { expiresIn });
  } catch (error) {
    throw new Error(
      `Failed to generate refresh token: ${(error as Error).message}`,
    );
  }
};

/**
 * Verifies the JWT token and returns the decoded payload.
 * @param {string} token - The JWT token to verify.
 * @returns {UserPayload} - Decoded token payload (e.g., user ID and role).
 * @throws {Error} - Throws error if token verification fails or JWT_SECRET is not defined.
 */
export const verifyToken = (token: string): UserPayload => {
  const secretKey = process.env.JWT_SECRET;
  if (!secretKey) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }

  try {
    return jwt.verify(token, secretKey) as UserPayload;
  } catch (error) {
    throw new Error(`Failed to verify token: ${(error as Error).message}`);
  }
};

/**
 * Verifies the refresh token and returns the decoded payload.
 * @param {string} refreshToken - The JWT refresh token to verify.
 * @returns {UserPayload} - Decoded refresh token payload (e.g., user ID and role).
 * @throws {Error} - Throws error if refresh token verification fails or JWT_REFRESH_SECRET is not defined.
 */
export const verifyRefreshToken = (refreshToken: string): UserPayload => {
  const refreshSecretKey = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecretKey) {
    throw new Error(
      "JWT_REFRESH_SECRET is not defined in environment variables.",
    );
  }

  try {
    return jwt.verify(refreshToken, refreshSecretKey) as UserPayload;
  } catch (error) {
    throw new Error(
      `Failed to verify refresh token: ${(error as Error).message}`,
    );
  }
};

export default {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
};
