


describe("friends routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/friendss ? 200 OK", async () => {
    const res = await global.authGet("/api/friends");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

