// @ts-nocheck
import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures/auth";

// Skip admin doc editor tests for now - requires seeded test database with valid admin credentials
// TODO: Add proper database seeding for authenticated E2E tests
test.describe.skip("Admin Doc Editor", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.email, TEST_ADMIN_USER.password);
  });

  test.describe("Invalid Doc", () => {
    test("redirects to docs list for non-existent doc", async ({ page }) => {
      await page.goto("/admin/marketing/docs/non-existent-doc-id");

      // Should redirect to docs list after API returns 404
      await expect(page).toHaveURL(/\/admin\/marketing\/docs/, {
        timeout: 10000,
      });
    });
  });

  test.describe("Page Access", () => {
    test("admin can access docs list", async ({ page }) => {
      await page.goto("/admin/marketing/docs");

      // Page should load
      await expect(page.locator("header")).toBeVisible();
    });
  });
});
