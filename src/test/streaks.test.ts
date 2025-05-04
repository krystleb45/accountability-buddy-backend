describe("leaderboard routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });

  it("GET /api/leaderboard ? 200 OK", async () => {
    const res = await global.authGet("/api/leaderboard");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});
