// @ts-nocheck
import { test, expect } from "@playwright/test";

test.describe("Blog Post Page", () => {
  test.describe("Invalid Slug", () => {
    test("shows 404 for non-existent blog post", async ({ page }) => {
      const response = await page.goto("/blog/non-existent-post-slug");

      // Should return 404
      expect(response?.status()).toBe(404);
    });

    test("shows 404 page content for invalid slug", async ({ page }) => {
      await page.goto("/blog/this-post-does-not-exist");

      // Should show not found message
      await expect(page.locator("text=not found")).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe("Blog List Access", () => {
    test("blog list page is accessible", async ({ page }) => {
      await page.goto("/blog");

      await expect(page.locator("text=Blog").first()).toBeVisible();
    });
  });
});
