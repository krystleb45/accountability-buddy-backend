describe("activity routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/activities ? 200 OK", async () => {
    const res = await global.authGet("/api/activity");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});
