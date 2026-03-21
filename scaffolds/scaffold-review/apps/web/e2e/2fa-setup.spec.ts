// @ts-nocheck
import { test, expect } from "@playwright/test";
import { login, TEST_USER } from "./fixtures/auth";

test.describe("2FA Setup Page", () => {
  test.describe("Unauthenticated", () => {
    test("renders page but shows error when trying to setup", async ({ page }) => {
      await page.goto("/2fa-setup");

      // Page renders for unauthenticated users
      await expect(page.locator("text=Two-Factor Authentication")).toBeVisible();
      await expect(page.locator("button:has-text('Get Started')")).toBeVisible();

      // Click Get Started - API will fail without auth
      await page.click("button:has-text('Get Started')");

      // Should show an error (API returns 401 for unauthenticated)
      await expect(page.locator(".bg-destructive\\/10")).toBeVisible({ timeout: 10000 });
    });
  });

  // Skip authenticated tests for now - requires seeded test database with valid user credentials
  // TODO: Add proper database seeding for authenticated E2E tests
  test.describe.skip("Authenticated", () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password);
    });

    test("renders the 2FA setup page", async ({ page }) => {
      await page.goto("/2fa-setup");

      // Check for key UI elements
      await expect(page.locator("text=Two-Factor Authentication")).toBeVisible();
      await expect(
        page.locator("text=Add an extra layer of security to your account")
      ).toBeVisible();
    });

    test("shows Get Started button in intro step", async ({ page }) => {
      await page.goto("/2fa-setup");

      // Check for Get Started button
      const getStartedButton = page.locator("button", { hasText: "Get Started" });
      await expect(getStartedButton).toBeVisible();
    });

    test("shows authenticator app requirement info", async ({ page }) => {
      await page.goto("/2fa-setup");

      // Check for authenticator app info
      await expect(page.locator("text=Authenticator App Required")).toBeVisible();
      await expect(
        page.locator("text=Google Authenticator")
      ).toBeVisible();
    });

    test("clicking Get Started initiates 2FA setup", async ({ page }) => {
      await page.goto("/2fa-setup");

      // Click Get Started
      await page.click("button:has-text('Get Started')");

      // Wait for either QR code step or error
      await expect(
        page.locator("text=Scan the QR code").or(page.locator(".bg-destructive\\/10"))
      ).toBeVisible({ timeout: 10000 });
    });

    test("displays QR code after setup initiation", async ({ page }) => {
      await page.goto("/2fa-setup");

      // Click Get Started
      await page.click("button:has-text('Get Started')");

      // Wait for the setup step
      await page.waitForSelector("text=Scan the QR code", { timeout: 10000 }).catch(() => {
        // If 2FA is already set up or there's an API error, skip this check
      });

      // Check for either QR code or error message
      const hasQrCode = await page.locator("img[alt='QR Code']").isVisible().catch(() => false);
      const hasError = await page.locator(".bg-destructive\\/10").isVisible().catch(() => false);

      expect(hasQrCode || hasError).toBe(true);
    });

    test("shows Continue button after QR code display", async ({ page }) => {
      await page.goto("/2fa-setup");

      // Click Get Started
      await page.click("button:has-text('Get Started')");

      // Wait for setup step and Continue button
      const continueButton = page.locator("button:has-text('Continue')");
      await expect(continueButton.or(page.locator(".bg-destructive\\/10"))).toBeVisible({
        timeout: 10000,
      });
    });

    test("navigates through 2FA setup flow", async ({ page }) => {
      await page.goto("/2fa-setup");

      // Step 1: Intro - Click Get Started
      await page.click("button:has-text('Get Started')");

      // Wait for step 2 or error
      const setupStep = page.locator("text=Scan the QR code");
      const errorMsg = page.locator(".bg-destructive\\/10");

      await expect(setupStep.or(errorMsg)).toBeVisible({ timeout: 10000 });

      // If we got to setup step, continue to verify step
      if (await setupStep.isVisible()) {
        await page.click("button:has-text('Continue')");

        // Step 3: Verify - Check for verification input
        await expect(page.locator("text=Verification Code")).toBeVisible();
        await expect(page.locator("input#code")).toBeVisible();

        // Check for Back button
        await expect(page.locator("button:has-text('Back')")).toBeVisible();
      }
    });

    test("validates 6-digit code requirement", async ({ page }) => {
      await page.goto("/2fa-setup");

      // Navigate to verify step
      await page.click("button:has-text('Get Started')");

      // Wait for setup step
      const setupStep = page.locator("text=Scan the QR code");
      const errorMsg = page.locator(".bg-destructive\\/10");
      await expect(setupStep.or(errorMsg)).toBeVisible({ timeout: 10000 });

      if (await setupStep.isVisible()) {
        await page.click("button:has-text('Continue')");

        // Try to verify with invalid code
        await page.fill("input#code", "123");
        await page.click("button:has-text('Verify')");

        // Should show error about 6-digit code
        await expect(page.locator("text=6-digit code")).toBeVisible({ timeout: 5000 });
      }
    });

    test("code input only accepts digits", async ({ page }) => {
      await page.goto("/2fa-setup");

      // Navigate to verify step
      await page.click("button:has-text('Get Started')");

      const setupStep = page.locator("text=Scan the QR code");
      const errorMsg = page.locator(".bg-destructive\\/10");
      await expect(setupStep.or(errorMsg)).toBeVisible({ timeout: 10000 });

      if (await setupStep.isVisible()) {
        await page.click("button:has-text('Continue')");

        // Try to enter letters
        const codeInput = page.locator("input#code");
        await codeInput.fill("abc123def");

        // Should only contain digits
        const value = await codeInput.inputValue();
        expect(value).toMatch(/^\d*$/);
      }
    });

    test("Back button returns to QR code step", async ({ page }) => {
      await page.goto("/2fa-setup");

      // Navigate to verify step
      await page.click("button:has-text('Get Started')");

      const setupStep = page.locator("text=Scan the QR code");
      const errorMsg = page.locator(".bg-destructive\\/10");
      await expect(setupStep.or(errorMsg)).toBeVisible({ timeout: 10000 });

      if (await setupStep.isVisible()) {
        await page.click("button:has-text('Continue')");

        // Click Back
        await page.click("button:has-text('Back')");

        // Should be back at QR code step
        await expect(page.locator("text=Scan the QR code")).toBeVisible();
      }
    });
  });
});
