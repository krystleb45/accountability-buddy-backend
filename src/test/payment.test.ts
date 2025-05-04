


describe("payment routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/payments ? 200 OK", async () => {
    const res = await global.authGet("/api/payment");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

