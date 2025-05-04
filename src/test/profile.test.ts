


describe("profile routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/profiles ? 200 OK", async () => {
    const res = await global.authGet("/api/profile");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

