


describe("books routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/bookss ? 200 OK", async () => {
    const res = await global.authGet("/api/books");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

