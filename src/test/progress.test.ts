


describe("progress routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/progresss ? 200 OK", async () => {
    const res = await global.authGet("/api/progress");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

