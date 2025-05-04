


describe("xpHistory routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/xp-history ? 200 OK", async () => {
    const res = await global.authGet("/api/xp-history");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

