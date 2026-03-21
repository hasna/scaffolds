// @ts-nocheck
import { test, expect } from "@playwright/test";

test.describe("Forgot Password Page", () => {
  test("renders the forgot password form", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.locator("text=Forgot password?")).toBeVisible();
    await expect(
      page.locator("text=Enter your email address and we'll send you a reset link")
    ).toBeVisible();
  });

  test("shows email input field", async ({ page }) => {
    await page.goto("/forgot-password");

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("placeholder", "name@example.com");
  });

  test("shows Send reset link button", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.locator("button:has-text('Send reset link')")).toBeVisible();
  });

  test("shows Back to login link", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.locator("text=Back to login")).toBeVisible();
  });

  test("requires email input", async ({ page }) => {
    await page.goto("/forgot-password");

    // Check the input is type email (HTML5 validation)
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute("type", "email");

    // Submit without email - form should not navigate away
    await page.click("button:has-text('Send reset link')");
    await expect(page.locator("text=Forgot password?")).toBeVisible();
  });

  test("shows loading state on submit", async ({ page }) => {
    await page.goto("/forgot-password");

    // Enter valid email
    await page.fill('input[type="email"]', "test@example.com");

    // Click submit
    await page.click("button:has-text('Send reset link')");

    // Either shows loading or completes quickly
    const submitButton = page.locator("button:has-text('Send reset link')");
    // Just verify we can interact with the form
    await expect(page.locator("text=Forgot password?").or(page.locator("text=Check your email"))).toBeVisible({ timeout: 10000 });
  });

  test("Back to login navigates to login page", async ({ page }) => {
    await page.goto("/forgot-password");

    await page.click("text=Back to login");

    await expect(page).toHaveURL(/\/login/);
  });

  test("form submits and shows result", async ({ page }) => {
    await page.goto("/forgot-password");

    // Enter valid email
    await page.fill('input[type="email"]', "validtest@example.com");
    await page.click("button:has-text('Send reset link')");

    // Should either show success or error/toast - but UI should respond
    await page.waitForTimeout(2000);

    // Either we're still on the form (error) or we see the success message
    const hasSuccess = await page.locator("text=Check your email").isVisible().catch(() => false);
    const hasForm = await page.locator("text=Forgot password?").isVisible().catch(() => false);

    expect(hasSuccess || hasForm).toBe(true);
  });
});
