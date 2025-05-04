describe("audit routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });

  it("GET /api/audit ? 200 OK", async () => {
    const res = await global.authGet("/api/audit");
    expect(res.status).toBe(200);
  });
});
