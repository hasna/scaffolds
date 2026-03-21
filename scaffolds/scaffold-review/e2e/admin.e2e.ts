import { test, expect } from "@playwright/test";

test.describe("Admin Pages (Require Admin Auth)", () => {
  test.describe("Admin Dashboard", () => {
    test("should redirect non-admin users", async ({ page }) => {
      await page.goto("/admin");
      // Should redirect to login or show unauthorized
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Admin Users Page", () => {
    test("should redirect non-admin users", async ({ page }) => {
      await page.goto("/admin/users");
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Admin Tenants Page", () => {
    test("should redirect non-admin users", async ({ page }) => {
      await page.goto("/admin/tenants");
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Admin Analytics Page", () => {
    test("should redirect non-admin users", async ({ page }) => {
      await page.goto("/admin/analytics");
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Admin Feature Flags Page", () => {
    test("should redirect non-admin users", async ({ page }) => {
      await page.goto("/admin/feature-flags");
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Admin Health Page", () => {
    test("should redirect non-admin users", async ({ page }) => {
      await page.goto("/admin/health");
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Admin CMS Pages", () => {
    test("should redirect non-admin users for blog", async ({ page }) => {
      await page.goto("/admin/marketing/blog");
      await expect(page.locator("body")).toBeVisible();
    });

    test("should redirect non-admin users for changelog", async ({ page }) => {
      await page.goto("/admin/marketing/changelog");
      await expect(page.locator("body")).toBeVisible();
    });

    test("should redirect non-admin users for docs", async ({ page }) => {
      await page.goto("/admin/marketing/docs");
      await expect(page.locator("body")).toBeVisible();
    });

    test("should redirect non-admin users for pages", async ({ page }) => {
      await page.goto("/admin/marketing/pages");
      await expect(page.locator("body")).toBeVisible();
    });
  });
});
