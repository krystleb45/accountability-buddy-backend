


describe("adminAnalytics routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/admin/analytics ? 200 OK", async () => {
    const res = await global.authGet("/api/admin/analytics");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

