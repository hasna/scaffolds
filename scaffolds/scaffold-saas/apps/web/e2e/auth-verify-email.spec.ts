// @ts-nocheck
import { test, expect } from "@playwright/test";

test.describe("Verify Email Page", () => {
  test.describe("No Token State", () => {
    test("shows check email message when no token provided", async ({
      page,
    }) => {
      await page.goto("/verify-email");

      await expect(page.locator("text=Email Verification")).toBeVisible();
      await expect(page.locator("text=Check your email")).toBeVisible();
    });

    test("shows verification email instructions", async ({ page }) => {
      await page.goto("/verify-email");

      await expect(
        page.locator("text=We sent you a verification email")
      ).toBeVisible();
    });

    test("shows back to login button", async ({ page }) => {
      await page.goto("/verify-email");

      const loginButton = page.getByRole("link", { name: "Back to Login" });
      await expect(loginButton).toBeVisible();
    });

    test("login button has correct href", async ({ page }) => {
      await page.goto("/verify-email");

      const loginLink = page.getByRole("link", { name: "Back to Login" });
      await expect(loginLink).toHaveAttribute("href", "/login");
    });
  });

  test.describe("Invalid Token", () => {
    test("shows error for invalid token", async ({ page }) => {
      await page.goto("/verify-email?token=invalid-token-12345");

      // Wait for the API call to complete and error to show
      await expect(page.locator("text=Verification failed")).toBeVisible({
        timeout: 10000,
      });
    });

    test("shows try again button on error", async ({ page }) => {
      await page.goto("/verify-email?token=bad-token");

      // Wait for error state
      await expect(page.locator("text=Verification failed")).toBeVisible({
        timeout: 10000,
      });

      await expect(page.getByRole("link", { name: "Try Again" })).toBeVisible();
    });

    test("shows back to login on error", async ({ page }) => {
      await page.goto("/verify-email?token=expired-token");

      // Wait for error state
      await expect(page.locator("text=Verification failed")).toBeVisible({
        timeout: 10000,
      });

      await expect(
        page.getByRole("link", { name: "Back to Login" })
      ).toBeVisible();
    });
  });

  test.describe("Page Structure", () => {
    test("has proper card layout", async ({ page }) => {
      await page.goto("/verify-email");

      await expect(page.locator("[data-slot='card']")).toBeVisible();
    });

    test("has email verification title", async ({ page }) => {
      await page.goto("/verify-email");

      await expect(page.locator("text=Email Verification")).toBeVisible();
    });
  });
});
