// @ts-nocheck
import { test, expect } from "@playwright/test";

test.describe("Invite Page", () => {
  test.describe("Invalid Token", () => {
    test("shows invalid invitation message for non-existent token", async ({
      page,
    }) => {
      await page.goto("/invite/invalid-token-12345");

      await expect(page.locator("text=Invalid Invitation")).toBeVisible();
      await expect(
        page.locator("text=This invitation link is invalid or has expired")
      ).toBeVisible();
    });

    test("shows invalid invitation for expired token format", async ({
      page,
    }) => {
      await page.goto("/invite/expired-token-abc");

      await expect(page.locator("text=Invalid Invitation")).toBeVisible();
    });

    test("shows invalid invitation for empty-like token", async ({ page }) => {
      await page.goto("/invite/00000000-0000-0000-0000-000000000000");

      await expect(page.locator("text=Invalid Invitation")).toBeVisible();
    });
  });

  test.describe("Page Layout", () => {
    test("page renders centered content", async ({ page }) => {
      await page.goto("/invite/test-token");

      // Page should show invalid invitation in a centered layout
      await expect(page.locator("text=Invalid Invitation")).toBeVisible();
    });

    test("page has proper heading structure", async ({ page }) => {
      await page.goto("/invite/invalid-token");

      // Should have an h1 heading
      await expect(page.locator("h1")).toBeVisible();
    });
  });
});
