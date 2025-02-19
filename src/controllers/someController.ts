import type { Request, Response } from "express";

// Example Controller Function
export const someController = (req: Request, res: Response): void => {
  try {
    const { name } = req.query;

    if (!name) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }

    const processedName = `Hello, ${name}!`;

    res.status(200).json({ success: true, message: processedName });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error) {
    // Use an underscore to suppress the warning
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
