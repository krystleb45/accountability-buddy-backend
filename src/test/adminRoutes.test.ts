describe("adminRoutes routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/admin ? 200 OK", async () => {
    const res = await global.authGet("/api/admin");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});
