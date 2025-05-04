describe("groupRoute routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/groups ? 200 OK", async () => {
    const res = await global.authGet("/api/groups");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});
