import { test, expect } from "@playwright/test";

test.describe("Resume API Routes", () => {
  test.describe("Authentication", () => {
    test("should return 401 for unauthenticated resume list", async ({ request }) => {
      const response = await request.get("/api/v1/resumes");
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated resume creation", async ({ request }) => {
      const response = await request.post("/api/v1/resumes", {
        data: {
          title: "Test Resume",
          template: "modern",
        },
      });
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated resume get", async ({ request }) => {
      const response = await request.get("/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000");
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated resume update", async ({ request }) => {
      const response = await request.put("/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000", {
        data: {
          title: "Updated Resume",
        },
      });
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated resume delete", async ({ request }) => {
      const response = await request.delete("/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000");
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Section API Authentication", () => {
    test("should return 401 for unauthenticated sections list", async ({ request }) => {
      const response = await request.get(
        "/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000/sections"
      );
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated section creation", async ({ request }) => {
      const response = await request.post(
        "/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000/sections",
        {
          data: {
            type: "experience",
            title: "Work Experience",
          },
        }
      );
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated section update", async ({ request }) => {
      const response = await request.put(
        "/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000/sections/123e4567-e89b-12d3-a456-426614174001",
        {
          data: {
            title: "Updated Section",
          },
        }
      );
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated section delete", async ({ request }) => {
      const response = await request.delete(
        "/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000/sections/123e4567-e89b-12d3-a456-426614174001"
      );
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated sections reorder", async ({ request }) => {
      const response = await request.post(
        "/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000/sections/reorder",
        {
          data: {
            sectionIds: ["123e4567-e89b-12d3-a456-426614174001"],
          },
        }
      );
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Special Endpoints Authentication", () => {
    test("should return 401 for unauthenticated duplicate", async ({ request }) => {
      const response = await request.post(
        "/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000/duplicate"
      );
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated variant creation", async ({ request }) => {
      const response = await request.post(
        "/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000/variant",
        {
          data: {
            title: "Test Variant",
            targetJobTitle: "Software Engineer",
          },
        }
      );
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated publish", async ({ request }) => {
      const response = await request.put(
        "/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000/publish",
        {
          data: {
            isPublic: true,
          },
        }
      );
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Export Endpoints", () => {
    test("should return 401 for unauthenticated PDF export", async ({ request }) => {
      const response = await request.get(
        "/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000/export/pdf"
      );
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated JSON export", async ({ request }) => {
      const response = await request.get(
        "/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000/export/json"
      );
      expect(response.status()).toBe(401);
    });

    test("should return 401 for unauthenticated DOCX export", async ({ request }) => {
      const response = await request.get(
        "/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000/export/docx"
      );
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Chat API Authentication", () => {
    test("should return 401 for unauthenticated chat", async ({ request }) => {
      const response = await request.post(
        "/api/v1/resumes/123e4567-e89b-12d3-a456-426614174000/chat",
        {
          data: {
            message: "Help me improve my resume",
          },
        }
      );
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Scrape API Authentication", () => {
    test("should return 401 for unauthenticated scrape", async ({ request }) => {
      const response = await request.post("/api/v1/scrape", {
        data: {
          url: "https://linkedin.com/in/testuser",
          extractType: "profile",
        },
      });
      expect(response.status()).toBe(401);
    });
  });
});

test.describe("Public Resume Page", () => {
  test("should return 404 for non-existent public resume", async ({ page }) => {
    const response = await page.goto("/r/non-existent-slug");
    expect(response?.status()).toBe(404);
  });

  test("should load public resume page structure", async ({ page }) => {
    // This test verifies the public resume route is set up correctly
    // Even if the resume doesn't exist, the page should handle it gracefully
    await page.goto("/r/test-slug");

    // The page should exist (even if showing 404 content)
    await expect(page).toHaveURL(/\/r\/test-slug/);
  });
});

test.describe("Resume Dashboard Pages", () => {
  test("should redirect unauthenticated users from resumes page", async ({ page }) => {
    await page.goto("/dashboard/resumes");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect unauthenticated users from new resume page", async ({ page }) => {
    await page.goto("/dashboard/resumes/new");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("should redirect unauthenticated users from resume editor", async ({ page }) => {
    await page.goto("/dashboard/resumes/123e4567-e89b-12d3-a456-426614174000");

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});
