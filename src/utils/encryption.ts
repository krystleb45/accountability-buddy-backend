import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

// Generate a random encryption key (should be securely stored or passed)
export const generateKey = (): Buffer => {
  return randomBytes(16); // AES-128
};

// Encrypt a message using AES-128-CBC
export const encryptMessage = (message: string, key: Buffer): string => {
  const iv = randomBytes(16); // Initialization Vector
  const cipher = createCipheriv("aes-128-cbc", key, iv);
  let encryptedMessage = cipher.update(message, "utf-8", "base64");
  encryptedMessage += cipher.final("base64");

  // Return the IV + encrypted message
  return iv.toString("base64") + encryptedMessage;
};

// Decrypt a message using AES-128-CBC
export const decryptMessage = (encryptedMessage: string, key: Buffer): string => {
  const iv = Buffer.from(encryptedMessage.substring(0, 24), "base64");
  const message = encryptedMessage.substring(24);
  const decipher = createDecipheriv("aes-128-cbc", key, iv);
  let decryptedMessage = decipher.update(message, "base64", "utf-8");
  decryptedMessage += decipher.final("utf-8");

  return decryptedMessage;
};
