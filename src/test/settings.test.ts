


describe("settings routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/settingss ? 200 OK", async () => {
    const res = await global.authGet("/api/settings");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

