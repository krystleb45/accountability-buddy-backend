


describe("support routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/supports ? 200 OK", async () => {
    const res = await global.authGet("/api/support");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

