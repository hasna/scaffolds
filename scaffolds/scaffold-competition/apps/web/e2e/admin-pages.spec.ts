// @ts-nocheck
import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures/auth";

// Skip admin pages tests for now - requires seeded test database with valid admin credentials
// TODO: Add proper database seeding for authenticated E2E tests
test.describe.skip("Admin Pages", () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await login(page, TEST_ADMIN_USER.email, TEST_ADMIN_USER.password);
  });

  test.describe("Admin Dashboard", () => {
    test("renders the admin page", async ({ page }) => {
      await page.goto("/admin");

      await expect(page.locator("text=Admin").first()).toBeVisible();
    });
  });

  test.describe("Admin Analytics", () => {
    test("renders the admin analytics page", async ({ page }) => {
      await page.goto("/admin/analytics");

      await expect(page.locator("text=Analytics").first()).toBeVisible();
    });
  });

  test.describe("Admin Users", () => {
    test("renders the admin users page", async ({ page }) => {
      await page.goto("/admin/users");

      await expect(page.locator("text=Users").first()).toBeVisible();
    });
  });

  test.describe("Admin Tenants", () => {
    test("renders the admin tenants page", async ({ page }) => {
      await page.goto("/admin/tenants");

      await expect(page.locator("text=Tenants").first()).toBeVisible();
    });
  });

  test.describe("Admin Health", () => {
    test("renders the admin health page", async ({ page }) => {
      await page.goto("/admin/health");

      // Just check that the page loaded and header is visible
      // Don't wait for networkidle as health checks may take long
      await expect(page.locator("header")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Admin Feature Flags", () => {
    test("renders the admin feature flags page", async ({ page }) => {
      await page.goto("/admin/feature-flags");

      await expect(page.locator("text=Feature").first()).toBeVisible();
    });
  });

  test.describe("Admin Marketing", () => {
    test("renders the admin blog page", async ({ page }) => {
      await page.goto("/admin/marketing/blog");

      await expect(page.locator("text=Blog").first()).toBeVisible();
    });

    test("renders the admin blog categories page", async ({ page }) => {
      await page.goto("/admin/marketing/blog/categories");

      await expect(page.locator("text=Categories").first()).toBeVisible();
    });

    test("renders the admin changelog page", async ({ page }) => {
      await page.goto("/admin/marketing/changelog");

      await expect(page.locator("text=Changelog").first()).toBeVisible();
    });

    test("renders the admin docs page", async ({ page }) => {
      await page.goto("/admin/marketing/docs");

      // Page should load without error
      await expect(page.locator("header")).toBeVisible();
    });

    test("renders the admin pages page", async ({ page }) => {
      await page.goto("/admin/marketing/pages");

      await expect(page.locator("text=Pages").first()).toBeVisible();
    });
  });
});
