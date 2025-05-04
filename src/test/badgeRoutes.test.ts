describe("badgeRoutes routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/badges ? 200 OK", async () => {
    const res = await global.authGet("/api/badges");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});
