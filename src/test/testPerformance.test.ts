import supertest from "supertest";
import app from "../app";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
jest.mock("compression", () => jest.fn(() => (_req: any, _res: any, next: () => any) => next()));

describe("Performance Tests", () => {
  it("should handle 100 concurrent requests", async () => {
    const promises = Array.from({ length: 100 }).map(() =>
      supertest(app).get("/"),
    );
    const results = await Promise.all(promises);
    results.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });
});
