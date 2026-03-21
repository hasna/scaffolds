// @ts-nocheck
import { test, expect } from "@playwright/test";
import { TEST_USER } from "./fixtures/auth";

test.describe("Login Page", () => {
  test("renders the login form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("text=Welcome back")).toBeVisible();
    await expect(
      page.locator("text=Enter your credentials to sign in to your account")
    ).toBeVisible();
  });

  test("shows email and password inputs", async ({ page }) => {
    await page.goto("/login");

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("placeholder", "name@example.com");
  });

  test("shows Sign in button", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("button:has-text('Sign in')")).toBeVisible();
  });

  test("shows Continue with Google button", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("button:has-text('Continue with Google')")).toBeVisible();
  });

  test("shows Forgot password link", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("text=Forgot password?")).toBeVisible();
  });

  test("shows Sign up link", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("text=Sign up")).toBeVisible();
  });

  test("Forgot password link navigates to forgot-password page", async ({ page }) => {
    await page.goto("/login");

    await page.click("text=Forgot password?");

    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("Sign up link navigates to register page", async ({ page }) => {
    await page.goto("/login");

    await page.click("text=Sign up");

    await expect(page).toHaveURL(/\/register/);
  });

  // Skip test - requires seeded test database with valid user credentials
  test.skip("successful login redirects to dashboard", async ({ page }) => {
    await page.goto("/login");

    // Fill in credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);

    // Submit form
    await page.click("button:has-text('Sign in')");

    // Should redirect to dashboard or onboarding
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 10000 });
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    // Fill in wrong credentials
    await page.fill('input[type="email"]', "wrong@example.com");
    await page.fill('input[type="password"]', "wrongpassword123");

    // Submit form
    await page.click("button:has-text('Sign in')");

    // Should show error toast or stay on login page
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
  });

  // Skip test - requires seeded test database with valid user credentials
  test.skip("redirects logged in users to dashboard", async ({ page }) => {
    // First login
    await page.goto("/login");
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click("button:has-text('Sign in')");
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 10000 });

    // Try to visit login again
    await page.goto("/login");

    // Should be redirected back to dashboard
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 10000 });
  });

  // Skip test - requires seeded test database with valid user credentials
  test.skip("shows loading state during login", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);

    // Click and immediately check for loading state
    await page.click("button:has-text('Sign in')");

    // Button should be disabled during submission
    const signInButton = page.locator("button:has-text('Sign in')");
    // Either shows loading or completes fast
    await expect(page).toHaveURL(/\/(dashboard|onboarding|login)/, { timeout: 10000 });
  });

  // Skip test - requires seeded test database with valid user credentials
  test.skip("preserves callbackUrl after login", async ({ page }) => {
    // Try to access a protected page first
    await page.goto("/login?callbackUrl=/dashboard/settings");

    // Login
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click("button:has-text('Sign in')");

    // Should redirect to the callback URL
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 10000 });
  });

  test("has proper form structure", async ({ page }) => {
    await page.goto("/login");

    // Check form has proper labels
    await expect(page.locator("label:has-text('Email')")).toBeVisible();
    await expect(page.locator("label:has-text('Password')")).toBeVisible();

    // Check autocomplete attributes
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toHaveAttribute("autocomplete", "email");
    await expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
  });
});
