


describe("email routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/emails ? 200 OK", async () => {
    const res = await global.authGet("/api/email");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

