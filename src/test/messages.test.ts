


describe("messages routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/messagess ? 200 OK", async () => {
    const res = await global.authGet("/api/messages");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

