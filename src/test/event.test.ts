


describe("event routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/events ? 200 OK", async () => {
    const res = await global.authGet("/api/events");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

