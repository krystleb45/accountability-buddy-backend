import { errorHandler } from "../middleware/errorHandler";
import type { Request, Response } from "express";

describe("Error Handling Tests", () => {
  it("should return a 500 error for unhandled exceptions", () => {
    const err = new Error("Test error");
    const req = {} as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "An unexpected error occurred.",
      success: false,
    });
  });
});
