


describe("adminReports routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/admin/reports ? 200 OK", async () => {
    const res = await global.authGet("/api/admin/reports");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

