import { someController } from "../controllers/someController";
import type { Request, Response } from "express";

describe("Controller Tests", () => {
  it("should return a successful response", () => {
    const req = {} as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    someController(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
