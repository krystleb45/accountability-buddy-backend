


describe("goalMessage routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/goal-messages ? 200 OK", async () => {
    const res = await global.authGet("/api/goal-messages");
    expect(res.status).toBe(200);
  });
});

