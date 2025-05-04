


describe("goalAnalyticsRoutes routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/goalssAnalyticsRoutes ? 200 OK", async () => {
    const res = await global.authGet("/api/goalssAnalyticsRoutes");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

