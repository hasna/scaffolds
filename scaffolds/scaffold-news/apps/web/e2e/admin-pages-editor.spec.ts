// @ts-nocheck
import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures/auth";

// Skip admin pages editor tests for now - requires seeded test database with valid admin credentials
// TODO: Add proper database seeding for authenticated E2E tests
test.describe.skip("Admin Page Editor", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.email, TEST_ADMIN_USER.password);
  });

  test.describe("Invalid Page", () => {
    test("redirects to pages list for non-existent page", async ({ page }) => {
      await page.goto("/admin/marketing/pages/non-existent-page-id");

      // Should redirect to pages list after API returns 404
      await expect(page).toHaveURL(/\/admin\/marketing\/pages/, {
        timeout: 10000,
      });
    });
  });

  test.describe("Page Access", () => {
    test("admin can access pages list", async ({ page }) => {
      await page.goto("/admin/marketing/pages");

      // Page should load
      await expect(page.locator("text=Pages").first()).toBeVisible();
    });
  });
});
