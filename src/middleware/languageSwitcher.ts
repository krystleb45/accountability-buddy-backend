import type { Request, Response, NextFunction } from "express";
import logger from "../utils/winstonLogger";

// Define the available languages
const availableLanguages = ["en", "de", "es", "fr", "jp"];

/**
 * Middleware to switch language based on user preference.
 * Checks `Accept-Language` header, cookies, or query parameters for language selection.
 */
const languageSwitcher = (req: Request, res: Response, next: NextFunction): void => {
  try {
    let lang: string | undefined =
      req.headers["accept-language"] ||
      req.cookies?.lang ||
      (req.query["lang"] as string);

    if (lang) {
      lang = lang.split("-")[0].toLowerCase();
    }

    req.lang = lang && availableLanguages.includes(lang) ? lang : "en";

    res.cookie("lang", req.lang, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    next();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error in languageSwitcher middleware: ${errorMessage}`);
    res.status(500).json({
      success: false,
      message: "An error occurred while setting language preferences",
    });
  }
};

export default languageSwitcher;
