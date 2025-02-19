import bcrypt from "bcryptjs";
import crypto from "crypto";

// Number of salt rounds for bcrypt (increase for stronger hashing, but slower performance)
const SALT_ROUNDS = 12;

/**
 * @desc Hashes a password using bcrypt.
 * @param {string} password - The plaintext password to hash.
 * @returns {Promise<string>} - Resolves to the hashed password.
 * @throws {Error} - Throws error if the input is invalid.
 */
export const hashPassword = async (password: string): Promise<string> => {
  if (typeof password !== "string" || password.length < 6) {
    throw new Error("Password must be a string with at least 6 characters.");
  }
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * @desc Compares a plaintext password with a hashed password.
 * @param {string} password - The plaintext password to compare.
 * @param {string} hashedPassword - The hashed password to compare against.
 * @returns {Promise<boolean>} - Resolves to true if passwords match, false otherwise.
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * @desc Encrypts data using AES-256-CBC encryption.
 * @param {string} text - The plaintext to encrypt.
 * @param {string} key - The encryption key (32 characters for AES-256).
 * @returns {string} - The encrypted data in hex format.
 * @throws {Error} - Throws error if the encryption key is invalid.
 */
export const encryptData = (text: string, key: string): string => {
  if (key.length !== 32) {
    throw new Error("Encryption key must be 32 characters long for AES-256.");
  }

  const iv = crypto.randomBytes(16); // Generate a random IV
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Return the IV and encrypted data in hex format
  return `${iv.toString("hex")}:${encrypted}`;
};

/**
 * @desc Decrypts data encrypted with AES-256-CBC.
 * @param {string} encryptedData - The encrypted data in hex format.
 * @param {string} key - The decryption key (32 characters for AES-256).
 * @returns {string} - The decrypted plaintext.
 * @throws {Error} - Throws error if the decryption key is invalid or data is malformed.
 */
export const decryptData = (encryptedData: string, key: string): string => {
  if (key.length !== 32) {
    throw new Error("Decryption key must be 32 characters long for AES-256.");
  }

  const [ivHex, encryptedHex] = encryptedData.split(":");
  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid encrypted data format.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

/**
 * @desc Generates a secure random token.
 * @param {number} [length=32] - The length of the token.
 * @returns {Promise<string>} - Resolves to a hex-encoded token.
 * @throws {Error} - Throws error if token generation fails.
 */
export const generateRandomToken = async (
  length = 32,
): Promise<string> => {
  try {
    const buffer = await crypto.randomBytes(length);
    return buffer.toString("hex");
  } catch (err) {
    throw new Error(
      `Failed to generate random token: ${(err as Error).message}`,
    );
  }
};
