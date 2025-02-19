import supertest from "supertest";
import app from "../../src/app";

describe("Integration Tests", () => {
  it("should handle multiple middleware and respond correctly", async () => {
    const response = await supertest(app).get("/some-endpoint");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
  });
});
