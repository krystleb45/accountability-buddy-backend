


describe("notifications routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/notificationss ? 200 OK", async () => {
    const res = await global.authGet("/api/notifications");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

