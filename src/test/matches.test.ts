


describe("matches routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/matchess ? 200 OK", async () => {
    const res = await global.authGet("/api/matches");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

