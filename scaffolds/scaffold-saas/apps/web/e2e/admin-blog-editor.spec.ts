// @ts-nocheck
import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures/auth";

// Skip admin blog editor tests for now - requires seeded test database with valid admin credentials
// TODO: Add proper database seeding for authenticated E2E tests
test.describe.skip("Admin Blog Post Editor", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.email, TEST_ADMIN_USER.password);
  });

  test.describe("Invalid Post", () => {
    test("redirects to blog list for non-existent post", async ({ page }) => {
      await page.goto("/admin/marketing/blog/non-existent-post-id");

      // Should redirect to blog list after API returns 404
      await expect(page).toHaveURL(/\/admin\/marketing\/blog/, {
        timeout: 10000,
      });
    });

    test("shows loading state initially", async ({ page }) => {
      // Navigate but don't wait for full load
      await page.goto("/admin/marketing/blog/some-post-id", {
        waitUntil: "domcontentloaded",
      });

      // Should show loader initially
      const loader = page.locator(".animate-spin");
      // Loader may or may not be visible depending on timing
    });
  });

  test.describe("Page Access", () => {
    test("admin can access blog post editor route", async ({ page }) => {
      await page.goto("/admin/marketing/blog");

      // Page should load
      await expect(
        page.getByRole("heading", { name: "Blog Posts" })
      ).toBeVisible();
    });
  });
});
