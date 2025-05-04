


describe("tracker routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/trackers ? 200 OK", async () => {
    const res = await global.authGet("/api/tracker");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

