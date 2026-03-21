// @ts-nocheck
import { test, expect } from "@playwright/test";

test.describe("Reset Password Page", () => {
  test.describe("Invalid Token", () => {
    test("shows invalid link message for non-existent token", async ({
      page,
    }) => {
      await page.goto("/reset-password/invalid-token-12345");

      await expect(page.locator("text=Invalid Link")).toBeVisible();
      await expect(
        page.locator("text=This password reset link is invalid or has expired")
      ).toBeVisible();
    });

    test("shows invalid link for random token", async ({ page }) => {
      await page.goto("/reset-password/random-reset-token-abc");

      await expect(page.locator("text=Invalid Link")).toBeVisible();
    });

    test("shows invalid link for UUID-like token", async ({ page }) => {
      await page.goto("/reset-password/00000000-0000-0000-0000-000000000000");

      await expect(page.locator("text=Invalid Link")).toBeVisible();
    });
  });

  test.describe("Page Layout", () => {
    test("invalid token page has proper heading", async ({ page }) => {
      await page.goto("/reset-password/invalid-token");

      // Should have an h1 heading
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText("Invalid Link");
    });

    test("page displays error message clearly", async ({ page }) => {
      await page.goto("/reset-password/test-invalid-token");

      // Should show the expiry message
      await expect(
        page.locator("text=invalid or has expired")
      ).toBeVisible();
    });
  });
});
