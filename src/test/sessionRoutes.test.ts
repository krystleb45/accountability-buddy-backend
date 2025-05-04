


describe("sessionRoutes routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/sessions ? 200 OK", async () => {
    const res = await global.authGet("/api/session");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

