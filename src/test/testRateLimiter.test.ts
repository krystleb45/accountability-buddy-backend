import type { Application } from "express";
import express from "express";
import supertest from "supertest";
import { globalRateLimiter } from "../utils/rateLimiter";

const app: Application = express();
app.use(globalRateLimiter);

app.get("/", (_req, res) => {
  res.send("Hello! This is a rate-limited route.");
});

describe("Rate Limiter Middleware", () => {
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(() => {
    request = supertest(app) as unknown as supertest.SuperTest<supertest.Test>; // Explicitly cast
    jest.setTimeout(10000);
  });

  it("should allow requests within the rate limit", async () => {
    const response = await request.get("/");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Hello! This is a rate-limited route.");
  });

  it("should block requests exceeding the rate limit", async () => {
    await request.get("/");
    await request.get("/");

    const response = await request.get("/");
    expect(response.status).toBe(429);
    expect(response.body.message).toMatch(/Rate limit exceeded/i);
  });

  it("should reset rate limit after the time window", async () => {
    await request.get("/");
    await request.get("/");

    const blockedResponse = await request.get("/");
    expect(blockedResponse.status).toBe(429);

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for reset

    const resetResponse = await request.get("/");
    expect(resetResponse.status).toBe(200);
    expect(resetResponse.text).toBe("Hello! This is a rate-limited route.");
  });
});
