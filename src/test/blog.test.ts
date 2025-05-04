


describe("blog routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/blogs ? 200 OK", async () => {
    const res = await global.authGet("/api/blog");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

