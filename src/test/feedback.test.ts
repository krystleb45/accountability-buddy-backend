


describe("feedback routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/feedbacks ? 200 OK", async () => {
    const res = await global.authGet("/api/feedback");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

