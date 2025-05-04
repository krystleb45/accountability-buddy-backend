


describe("userpointsRoute routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/usersspointsRoute ? 200 OK", async () => {
    const res = await global.authGet("/api/usersspointsRoute");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

