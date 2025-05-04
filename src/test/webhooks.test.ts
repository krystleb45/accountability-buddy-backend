


describe("webhooks routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /webhooks/stripe ? 200 OK", async () => {
    const res = await global.authGet("/webhooks/stripe");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

