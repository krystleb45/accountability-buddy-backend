


describe("notificationTriggers routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/notification-triggers ? 200 OK", async () => {
    const res = await global.authGet("/api/notification-triggers");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

