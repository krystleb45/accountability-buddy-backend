


describe("redemptions routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/redemptionss ? 200 OK", async () => {
    const res = await global.authGet("/api/redemptions");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

