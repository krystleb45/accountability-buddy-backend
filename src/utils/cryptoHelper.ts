import crypto from "crypto";

/**
 * @desc Generates a random string with the specified length.
 * @param {number} length - Length of the random string.
 * @returns {string} - Randomly generated string.
 */
export const generateRandomString = (length: number): string => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
};

/**
 * @desc Hashes a string using the SHA-256 algorithm.
 * @param {string} input - The string to hash.
 * @returns {string} - The hashed output as a hexadecimal string.
 */
export const hashSHA256 = (input: string): string => {
  return crypto.createHash("sha256").update(input).digest("hex");
};

/**
 * @desc Encrypts data using AES-256-CBC.
 * @param {string} plaintext - The data to encrypt.
 * @param {string} secretKey - A 32-character secret key.
 * @param {string} iv - A 16-character initialization vector.
 * @returns {string} - The encrypted data in base64 format.
 */
export const encryptAES = (plaintext: string, secretKey: string, iv: string): string => {
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(secretKey, "utf8"), Buffer.from(iv, "utf8"));
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return encrypted.toString("base64");
};

/**
 * @desc Decrypts data using AES-256-CBC.
 * @param {string} encryptedData - The encrypted data in base64 format.
 * @param {string} secretKey - A 32-character secret key.
 * @param {string} iv - A 16-character initialization vector.
 * @returns {string} - The decrypted data.
 */
export const decryptAES = (encryptedData: string, secretKey: string, iv: string): string => {
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(secretKey, "utf8"), Buffer.from(iv, "utf8"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedData, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
};

/**
 * @desc Generates a secure random token.
 * @param {number} byteLength - Length of the token in bytes.
 * @returns {Promise<string>} - Secure random token in hexadecimal format.
 */
export const generateSecureToken = async (byteLength: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(byteLength, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(buffer.toString("hex"));
      }
    });
  });
};

/**
 * @desc Validates if a given hash matches a string using SHA-256.
 * @param {string} input - The original string.
 * @param {string} hash - The hash to validate.
 * @returns {boolean} - True if the hash matches, otherwise false.
 */
export const validateHash = (input: string, hash: string): boolean => {
  return hashSHA256(input) === hash;
};

/**
 * @desc Generates a PBKDF2-derived key.
 * @param {string} password - The password to derive the key from.
 * @param {string} salt - The salt value.
 * @param {number} iterations - The number of PBKDF2 iterations.
 * @param {number} keyLength - The desired key length in bytes.
 * @returns {Promise<string>} - Derived key in hexadecimal format.
 */
export const generatePBKDF2Key = async (
  password: string,
  salt: string,
  iterations: number,
  keyLength: number,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, keyLength, "sha256", (err, derivedKey) => {
      if (err) {
        reject(err);
      } else {
        resolve(derivedKey.toString("hex"));
      }
    });
  });
};

export default {
  generateRandomString,
  hashSHA256,
  encryptAES,
  decryptAES,
  generateSecureToken,
  validateHash,
  generatePBKDF2Key,
};
