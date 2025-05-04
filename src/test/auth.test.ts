describe("Auth + seeded users", () => {
  it("should log in…", async () => {
    const res = await global.authPost("/api/auths/login", {
      email: "admin@example.com",
      password: "password123",
    });
    expect(res.status).toBe(200);
    // …
  });
});

