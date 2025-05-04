


describe("newsletter routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/newsletters ? 200 OK", async () => {
    const res = await global.authGet("/api/newsletter");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

