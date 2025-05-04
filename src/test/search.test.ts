


describe("search routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/searchs ? 200 OK", async () => {
    const res = await global.authGet("/api/search");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

