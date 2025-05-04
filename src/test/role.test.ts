


describe("role routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/roles ? 200 OK", async () => {
    const res = await global.authGet("/api/role");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

