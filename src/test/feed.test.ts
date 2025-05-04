


describe("feed routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/feeds ? 200 OK", async () => {
    const res = await global.authGet("/api/feed");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

