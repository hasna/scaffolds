// @ts-nocheck
import { test, expect } from "@playwright/test";

test.describe("Blog Category Page", () => {
  test.describe("Invalid Category", () => {
    test("shows 404 for non-existent category", async ({ page }) => {
      const response = await page.goto("/blog/category/non-existent-category");

      // Should return 404
      expect(response?.status()).toBe(404);
    });

    test("shows not found message for invalid category", async ({ page }) => {
      await page.goto("/blog/category/this-category-does-not-exist");

      // Should show not found message
      await expect(page.locator("text=not found")).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe("Blog Access", () => {
    test("blog main page is accessible", async ({ page }) => {
      await page.goto("/blog");

      await expect(page.locator("text=Blog").first()).toBeVisible();
    });
  });
});
