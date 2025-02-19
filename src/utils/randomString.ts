import crypto from "crypto";

/**
 * @desc    Utility to generate a random string with configurable options:
 *          - Length of the string
 *          - Character set (alphanumeric, numeric-only, hex, alphabetic, or custom)
 *          - Option to use cryptographic randomness for security-sensitive purposes
 * @param   length - The desired length of the random string (must be a positive integer).
 * @param   charset - Optional. The set of characters to use for the string generation. Default is alphanumeric.
 * @param   cryptoSecure - Optional. Whether to use cryptographic randomness. Default is false.
 * @returns The generated random string.
 * @throws  Throws error if input parameters are invalid.
 */
const randomString = (
  length = 16,
  charset: "alphanumeric" | "numeric" | "hex" | "alphabetic" | string = "alphanumeric",
  cryptoSecure = false,
): string => {
  // Validate length
  if (typeof length !== "number" || length <= 0 || !Number.isInteger(length)) {
    throw new Error("Length must be a positive integer.");
  }

  // Define common character sets
  const charsets: { [key: string]: string } = {
    alphanumeric: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    numeric: "0123456789",
    hex: "0123456789abcdef",
    alphabetic: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  };

  // Set the available character set
  const availableChars = charsets[charset] || charset;
  if (typeof availableChars !== "string" || availableChars.length === 0) {
    throw new Error("Charset must be a non-empty string.");
  }

  let result = "";

  if (cryptoSecure) {
    // Use cryptographic randomness
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += availableChars[bytes[i] % availableChars.length];
    }
  } else {
    // Use Math.random for non-crypto secure randomness
    for (let i = 0; i < length; i++) {
      result += availableChars[Math.floor(Math.random() * availableChars.length)];
    }
  }

  return result;
};

export default randomString;
