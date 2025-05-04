


describe("chat routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/chats ? 200 OK", async () => {
    const res = await global.authGet("/api/chat");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

