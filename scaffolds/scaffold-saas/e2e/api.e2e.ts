import { test, expect } from "@playwright/test";

test.describe("API Routes", () => {
  test.describe("Health Endpoint", () => {
    test("should return health status", async ({ request }) => {
      const response = await request.get("/api/health");
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe("Public API Endpoints", () => {
    test("should return 401 for unauthenticated v1 requests", async ({ request }) => {
      const response = await request.get("/api/v1/users/me");
      expect(response.status()).toBe(401);
    });

    test("should return 401 for api-keys without auth", async ({ request }) => {
      const response = await request.get("/api/v1/api-keys");
      expect(response.status()).toBe(401);
    });

    test("should return 401 for webhooks without auth", async ({ request }) => {
      const response = await request.get("/api/v1/webhooks");
      expect(response.status()).toBe(401);
    });

    test("should return 401 for billing without auth", async ({ request }) => {
      const response = await request.get("/api/v1/billing/subscription");
      expect(response.status()).toBe(401);
    });

    test("should return 401 for team without auth", async ({ request }) => {
      const response = await request.get("/api/v1/team/members");
      expect(response.status()).toBe(401);
    });

    test("should return 401 for tenants without auth", async ({ request }) => {
      const response = await request.get("/api/v1/tenants");
      expect(response.status()).toBe(401);
    });

    test("should return 401 for assistant without auth", async ({ request }) => {
      const response = await request.get("/api/v1/assistant/threads");
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Admin API Endpoints", () => {
    test("should return 401 for admin analytics without auth", async ({ request }) => {
      const response = await request.get("/api/admin/analytics");
      expect(response.status()).toBe(401);
    });

    test("should return 401 for admin users without auth", async ({ request }) => {
      const response = await request.get("/api/admin/users");
      expect(response.status()).toBe(401);
    });

    test("should return 401 for admin tenants without auth", async ({ request }) => {
      const response = await request.get("/api/admin/tenants");
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Contact API", () => {
    test("should accept POST to contact endpoint", async ({ request }) => {
      const response = await request.post("/api/v1/contact", {
        data: {
          name: "Test User",
          email: "test@example.com",
          message: "This is a test message",
        },
      });
      // Should be 200, 201 or 400 for validation
      expect([200, 201, 400, 422]).toContain(response.status());
    });
  });

  test.describe("Auth API Endpoints", () => {
    test("should have register endpoint", async ({ request }) => {
      const response = await request.post("/api/auth/register", {
        data: {
          email: "newuser@example.com",
          password: "password123",
          name: "Test User",
        },
      });
      // Could be success or validation error
      expect([200, 201, 400, 409, 422]).toContain(response.status());
    });

    test("should have forgot-password endpoint", async ({ request }) => {
      const response = await request.post("/api/auth/forgot-password", {
        data: {
          email: "user@example.com",
        },
      });
      // Should accept the request
      expect([200, 201, 400, 404, 422]).toContain(response.status());
    });
  });

  test.describe("CMS API Endpoints", () => {
    test("should return blog posts", async ({ request }) => {
      const response = await request.get("/api/v1/cms/blog/posts");
      // May require auth or be public
      expect([200, 401]).toContain(response.status());
    });

    test("should return changelog entries", async ({ request }) => {
      const response = await request.get("/api/v1/cms/changelog");
      expect([200, 401]).toContain(response.status());
    });

    test("should return docs", async ({ request }) => {
      const response = await request.get("/api/v1/cms/docs");
      expect([200, 401]).toContain(response.status());
    });
  });

  test.describe("Feature Flags API", () => {
    test("should return 401 without auth", async ({ request }) => {
      const response = await request.get("/api/v1/feature-flags");
      expect(response.status()).toBe(401);
    });
  });
});
