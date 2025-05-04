describe("rateLimit routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/rate-limit ? 200 OK", async () => {
    const res = await global.authGet("/api/rate-limit");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});
