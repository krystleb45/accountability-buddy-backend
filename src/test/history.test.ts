


describe("history routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/histories ? 200 OK", async () => {
    const res = await global.authGet("/api/histories");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

