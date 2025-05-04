


describe("gamification routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/gamifications ? 200 OK", async () => {
    const res = await global.authGet("/api/gamification");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

