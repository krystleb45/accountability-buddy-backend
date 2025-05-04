


describe("militarySupportRoutes routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/military-support ? 200 OK", async () => {
    const res = await global.authGet("/api/military-support");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

