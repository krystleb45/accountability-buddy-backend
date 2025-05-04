


describe("milestone routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/milestoness ? 200 OK", async () => {
    const res = await global.authGet("/api/milestone");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

