import bcrypt from "bcryptjs";

// Default salt rounds for bcrypt
const DEFAULT_SALT_ROUNDS = 12;

/**
 * Hashes a plain text password using bcrypt.
 * @param {string} password - The plain text password to hash.
 * @returns {Promise<string>} - The hashed password.
 * @throws {Error} - Throws an error if input is invalid or hashing fails.
 */
export const hashPassword = async (password: string): Promise<string> => {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string.");
  }

  // Use environment variable for salt rounds, default to 12
  const saltRounds =
    parseInt(process.env.SALT_ROUNDS || "", 10) || DEFAULT_SALT_ROUNDS;

  try {
    const salt = await bcrypt.genSalt(saltRounds);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error(`Failed to hash password: ${(error as Error).message}`);
  }
};

/**
 * Compares a plain text password with a hashed password.
 * @param {string} password - The plain text password.
 * @param {string} hashedPassword - The hashed password.
 * @returns {Promise<boolean>} - Returns true if the passwords match, otherwise false.
 * @throws {Error} - Throws an error if input is invalid or comparison fails.
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string.");
  }

  if (!hashedPassword || typeof hashedPassword !== "string") {
    throw new Error("Hashed password must be a non-empty string.");
  }

  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error(`Failed to compare passwords: ${(error as Error).message}`);
  }
};

/**
 * Checks if a password meets security requirements.
 * @param {string} password - The plain text password.
 * @returns {boolean} - True if the password is strong enough, otherwise false.
 */
export const isPasswordStrong = (password: string): boolean => {
  if (!password || typeof password !== "string") {
    return false;
  }

  // Strong password requirements: at least 8 characters, 1 letter, 1 number, 1 special character
  const strongPasswordPattern =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

  return strongPasswordPattern.test(password);
};

export default {
  hashPassword,
  comparePassword,
  isPasswordStrong,
};
