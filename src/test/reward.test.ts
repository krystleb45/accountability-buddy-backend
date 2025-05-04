


describe("reward routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/rewards ? 200 OK", async () => {
    const res = await global.authGet("/api/reward");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

