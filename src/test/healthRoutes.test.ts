describe("healthRoutes routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/health ? 200 OK", async () => {
    const res = await global.authGet("/api/health");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});
