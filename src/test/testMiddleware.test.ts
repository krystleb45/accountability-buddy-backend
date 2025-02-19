import type { Request, Response } from "express";
import { globalRateLimiter } from "../utils/rateLimiter";

jest.mock("express-rate-limit", () => {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  return jest.fn(() => (_req: any, _res: any, next: () => any) => next());
});

describe("Middleware Tests", () => {
  it("should call next if rate limit is not exceeded", async () => {
    // Mock request and response objects
    const req = {
      ip: "127.0.0.1", // Mock IP
    } as unknown as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();

    // Call the middleware
    await globalRateLimiter(req, res, next);

    // Assert that next() is called
    expect(next).toHaveBeenCalled();
  });
});

