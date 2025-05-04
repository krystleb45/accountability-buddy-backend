describe("collaborationGoals routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/collaboration-goals ? 200 OK", async () => {
    const res = await global.authGet("/api/collaboration-goals");
    expect(res.status).toBe(200);
  });
  // TODO: add more assertions here
});
