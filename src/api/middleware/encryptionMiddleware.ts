import { Request, Response, NextFunction } from "express";
import { encryptMessage, decryptMessage } from "../../utils/encryption"; // Import encryption utilities
import { logger } from "../../utils/winstonLogger"; // Logger for monitoring and debugging

// A static encryption key for this example (replace with a secure solution in production)
const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY || "your-default-encryption-key-here", "utf-8");

/**
 * Middleware to encrypt sensitive data before saving to the database
 */
export const encryptData = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Encrypt the message if it exists in the request body
    if (req.body.message) {
      const encryptedMessage = encryptMessage(req.body.message, encryptionKey);  // Pass key here
      req.body.message = encryptedMessage; // Replace the message with the encrypted version
      logger.info("Message encrypted successfully.");
    }

    // If you need to encrypt user credentials like password
    if (req.body.password) {
      const encryptedPassword = encryptMessage(req.body.password, encryptionKey);  // Pass key here
      req.body.password = encryptedPassword; // Encrypt user password before saving
      logger.info("Password encrypted successfully.");
    }

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    logger.error("Error in encryptData middleware: ", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * Middleware to decrypt sensitive data before sending it to the client
 */
export const decryptData = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Decrypt the message if it exists in the request body
    if (req.body.message) {
      const decryptedMessage = decryptMessage(req.body.message, encryptionKey);  // Pass key here
      req.body.message = decryptedMessage; // Replace the encrypted message with the decrypted version
      logger.info("Message decrypted successfully.");
    }

    // If you have other encrypted fields to decrypt (e.g., password), add similar decryption logic here

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    logger.error("Error in decryptData middleware: ", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
