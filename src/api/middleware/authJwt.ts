// src/api/middleware/authJwt.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function authenticateJwt(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  console.warn("[authJwt] Authorization header:", authHeader);

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret) {
      console.error("[authJwt] Missing ACCESS_TOKEN_SECRET");
      return next();
    }

    try {
      const payload = jwt.verify(token, secret) as { id: string };
      console.warn("[authJwt] JWT payload:", payload);
      req.user = { id: payload.id };
    } catch (err) {
      console.warn("[authJwt] JWT verification failed:", err);
    }
  }

  next();
}
