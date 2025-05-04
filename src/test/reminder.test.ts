


describe("reminder routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/reminderss ? 200 OK", async () => {
    const res = await global.authGet("/api/reminder");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

