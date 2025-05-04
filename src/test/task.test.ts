


describe("task routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/tasks ? 200 OK", async () => {
    const res = await global.authGet("/api/task");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

