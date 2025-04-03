import { Request, Response, NextFunction } from "express";

// List of sensitive words (you can expand this as needed)
const sensitiveWords = [
  "suicide",
  "violence",
  "abuse",
  "self-harm",
  "racism",
  "hate",
  "war",
  "drugs",
  "rape",
  // Add more sensitive words as needed
];

// Middleware to filter sensitive messages
const filterMessageContent = (message: string): string => {
  // Convert message to lowercase for case-insensitive comparison
  const messageLower = message.toLowerCase();

  // Check if the message contains any sensitive words
  const containsSensitiveWords = sensitiveWords.some((word) => messageLower.includes(word));

  // If a sensitive word is found, flag the message and replace sensitive words with asterisks
  if (containsSensitiveWords) {
    let filteredMessage = message;
    sensitiveWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi"); // Match whole words
      filteredMessage = filteredMessage.replace(regex, (match) => "*".repeat(match.length)); // Replace with asterisks
    });

    return filteredMessage; // Return the filtered message
  }

  return message; // Return the original message if no sensitive words are found
};

// Middleware function
const messageFilterMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { text } = req.body; // Assuming the message text is passed in the body

    if (text && typeof text === "string") {
      // Filter the message content
      req.body.text = filterMessageContent(text);
    }

    // Proceed to the next middleware or controller
    next();
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Error filtering message", error: error.message });
  }
};

export default messageFilterMiddleware;
