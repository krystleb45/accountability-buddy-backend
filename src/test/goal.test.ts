


describe("goal routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/goalss ? 200 OK", async () => {
    const res = await global.authGet("/api/goal");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

