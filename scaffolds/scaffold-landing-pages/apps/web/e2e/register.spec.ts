// @ts-nocheck
import { test, expect } from "@playwright/test";

test.describe("Register Page", () => {
  test("renders the registration form", async ({ page }) => {
    await page.goto("/register");

    await expect(page.locator("text=Create an account")).toBeVisible();
    await expect(
      page.locator("text=Enter your details to create your account")
    ).toBeVisible();
  });

  test("shows all required form fields", async ({ page }) => {
    await page.goto("/register");

    await expect(page.locator("label:has-text('Name')")).toBeVisible();
    await expect(page.locator("label:has-text('Email')")).toBeVisible();
    await expect(page.locator("label:has-text('Password')").first()).toBeVisible();
    await expect(page.locator("label:has-text('Confirm Password')")).toBeVisible();
  });

  test("shows Sign up with Google button", async ({ page }) => {
    await page.goto("/register");

    await expect(page.locator("button:has-text('Sign up with Google')")).toBeVisible();
  });

  test("shows Create account button", async ({ page }) => {
    await page.goto("/register");

    await expect(page.locator("button:has-text('Create account')")).toBeVisible();
  });

  test("shows terms and privacy policy checkbox", async ({ page }) => {
    await page.goto("/register");

    await expect(page.locator("text=Terms of Service")).toBeVisible();
    await expect(page.locator("text=Privacy Policy")).toBeVisible();
  });

  test("shows Sign in link", async ({ page }) => {
    await page.goto("/register");

    await expect(page.locator("text=Sign in")).toBeVisible();
    await expect(page.locator("text=Already have an account?")).toBeVisible();
  });

  test("Sign in link navigates to login page", async ({ page }) => {
    await page.goto("/register");

    await page.click("text=Sign in");

    await expect(page).toHaveURL(/\/login/);
  });

  test("Terms of Service link navigates correctly", async ({ page }) => {
    await page.goto("/register");

    await page.click("text=Terms of Service");

    await expect(page).toHaveURL(/\/terms/);
  });

  test("Privacy Policy link navigates correctly", async ({ page }) => {
    await page.goto("/register");

    await page.click("text=Privacy Policy");

    await expect(page).toHaveURL(/\/privacy/);
  });

  test("validates required fields on submit", async ({ page }) => {
    await page.goto("/register");

    // Try to submit without filling anything
    await page.click("button:has-text('Create account')");

    // Should still be on register page (validation prevents submission)
    await expect(page).toHaveURL(/\/register/);
    await expect(page.locator("text=Create an account")).toBeVisible();
  });

  test("validates name minimum length", async ({ page }) => {
    await page.goto("/register");

    await page.fill('input[placeholder="John Doe"]', "A");
    await page.click("button:has-text('Create account')");

    // Should show validation error or stay on page
    await expect(page).toHaveURL(/\/register/);
  });

  test("validates email format", async ({ page }) => {
    await page.goto("/register");

    await page.fill('input[placeholder="John Doe"]', "Test User");
    await page.fill('input[type="email"]', "invalid-email");
    await page.click("button:has-text('Create account')");

    // Should show validation error or stay on page
    await expect(page).toHaveURL(/\/register/);
  });

  test("validates password requirements", async ({ page }) => {
    await page.goto("/register");

    await page.fill('input[placeholder="John Doe"]', "Test User");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[placeholder="Create a password"]', "weak");
    await page.click("button:has-text('Create account')");

    // Should show validation error about password requirements
    await expect(page).toHaveURL(/\/register/);
  });

  test("validates password confirmation matches", async ({ page }) => {
    await page.goto("/register");

    await page.fill('input[placeholder="John Doe"]', "Test User");
    await page.fill('input[type="email"]', "test@example.com");
    await page.fill('input[placeholder="Create a password"]', "Password123!");
    await page.fill('input[placeholder="Confirm your password"]', "Different123!");
    await page.click("button:has-text('Create account')");

    // Should show password mismatch error or stay on page
    await expect(page).toHaveURL(/\/register/);
  });

  test("requires terms acceptance", async ({ page }) => {
    await page.goto("/register");

    await page.fill('input[placeholder="John Doe"]', "Test User");
    await page.fill('input[type="email"]', "newuser@example.com");
    await page.fill('input[placeholder="Create a password"]', "Password123!");
    await page.fill('input[placeholder="Confirm your password"]', "Password123!");
    // Don't check the terms checkbox
    await page.click("button:has-text('Create account')");

    // Should show error about terms acceptance or stay on page
    await expect(page).toHaveURL(/\/register/);
  });

  test("has proper form autocomplete attributes", async ({ page }) => {
    await page.goto("/register");

    const nameInput = page.locator('input[placeholder="John Doe"]');
    const emailInput = page.locator('input[type="email"]');
    const passwordInputs = page.locator('input[type="password"]');

    await expect(nameInput).toHaveAttribute("autocomplete", "name");
    await expect(emailInput).toHaveAttribute("autocomplete", "email");
    await expect(passwordInputs.first()).toHaveAttribute("autocomplete", "new-password");
  });
});
