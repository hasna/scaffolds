import { test, expect } from "@playwright/test";

test.describe("Health Check", () => {
  test("should return healthy status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBeDefined();
    expect(data.timestamp).toBeDefined();
    expect(data.checks).toBeDefined();
    expect(data.checks.database).toBeDefined();
  });

  test("should have database check", async ({ request }) => {
    const response = await request.get("/api/health");
    const data = await response.json();

    expect(data.checks.database.status).toBeDefined();
    if (data.checks.database.status === "healthy") {
      expect(data.checks.database.latency).toBeGreaterThanOrEqual(0);
    }
  });
});
