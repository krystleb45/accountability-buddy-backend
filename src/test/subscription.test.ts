


describe("subscription routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/subscriptions ? 200 OK", async () => {
    const res = await global.authGet("/api/subscription");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

