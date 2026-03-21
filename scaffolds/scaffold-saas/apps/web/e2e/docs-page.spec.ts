// @ts-nocheck
import { test, expect } from "@playwright/test";

test.describe("Docs Page", () => {
  test.describe("Invalid Doc Slug", () => {
    test("shows 404 for non-existent doc", async ({ page }) => {
      const response = await page.goto("/docs/non-existent-doc-slug");

      // Should return 404
      expect(response?.status()).toBe(404);
    });

    test("shows not found message for invalid doc slug", async ({ page }) => {
      await page.goto("/docs/this-doc-does-not-exist");

      // Should show not found message
      await expect(page.locator("text=not found")).toBeVisible({
        timeout: 5000,
      });
    });

    test("handles nested slugs that don't exist", async ({ page }) => {
      const response = await page.goto("/docs/getting-started/invalid-section");

      // Should return 404
      expect(response?.status()).toBe(404);
    });
  });

  test.describe("Docs Index", () => {
    test("docs index page is accessible", async ({ page }) => {
      await page.goto("/docs");

      // Should show header
      await expect(page.locator("header")).toBeVisible();
    });
  });
});
