


describe("user routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/userss ? 200 OK", async () => {
    const res = await global.authGet("/api/users");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

