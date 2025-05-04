


describe("testPerformance.test routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/testPerformances.test → 200 OK", async () => {
    const res = await global.authGet("/api/testPerformances.test");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });

  // TODO: add POST/PUT/DELETE tests for /api/testPerformances.test as needed
});

