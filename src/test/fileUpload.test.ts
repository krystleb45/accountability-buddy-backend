


describe("fileUpload routes", () => {
  it("smoke test runs", () => {
    expect(true).toBe(true);
  });
  it("GET /api/fileUploads ? 200 OK", async () => {
    const res = await global.authGet("/api/fileUpload");
    expect(res.status).toBe(200);
    // TODO: add more assertions here
  });
});

