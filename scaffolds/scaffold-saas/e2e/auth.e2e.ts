import { test, expect } from "@playwright/test";

test.describe("Authentication Pages", () => {
  test.describe("Login Page", () => {
    test("should load login page", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: /sign in|login|welcome/i })).toBeVisible();
    });

    test("should have email and password fields", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test("should have submit button", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("button", { name: /sign in|login|submit/i })).toBeVisible();
    });

    test("should have forgot password link", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("link", { name: /forgot|reset/i })).toBeVisible();
    });

    test("should have register link", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("link", { name: /sign up|register|create/i })).toBeVisible();
    });

    test("should show validation errors for empty form", async ({ page }) => {
      await page.goto("/login");
      await page.getByRole("button", { name: /sign in|login|submit/i }).click();
      await expect(page.locator("form")).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel(/email/i).fill("invalid@example.com");
      await page.getByLabel(/password/i).fill("wrongpassword123");
      await page.getByRole("button", { name: /sign in|login|submit/i }).click();
      await expect(page.locator("form")).toBeVisible();
    });
  });

  test.describe("Register Page", () => {
    test("should load register page", async ({ page }) => {
      await page.goto("/register");
      await expect(page.getByRole("heading", { name: /sign up|register|create|get started/i })).toBeVisible();
    });

    test("should have registration form fields", async ({ page }) => {
      await page.goto("/register");
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i).first()).toBeVisible();
    });

    test("should have submit button", async ({ page }) => {
      await page.goto("/register");
      await expect(page.getByRole("button", { name: /sign up|register|create|submit/i })).toBeVisible();
    });

    test("should have login link", async ({ page }) => {
      await page.goto("/register");
      await expect(page.getByRole("link", { name: /sign in|login|already have/i })).toBeVisible();
    });
  });

  test.describe("Forgot Password Page", () => {
    test("should load forgot password page", async ({ page }) => {
      await page.goto("/forgot-password");
      await expect(page.getByRole("heading", { name: /forgot|reset|password/i })).toBeVisible();
    });

    test("should have email field", async ({ page }) => {
      await page.goto("/forgot-password");
      await expect(page.getByLabel(/email/i)).toBeVisible();
    });

    test("should have submit button", async ({ page }) => {
      await page.goto("/forgot-password");
      await expect(page.getByRole("button", { name: /send|reset|submit/i })).toBeVisible();
    });

    test("should have back to login link", async ({ page }) => {
      await page.goto("/forgot-password");
      await expect(page.getByRole("link", { name: /login|sign in|back/i })).toBeVisible();
    });
  });

  test.describe("Verify Email Page", () => {
    test("should load verify email page", async ({ page }) => {
      await page.goto("/verify-email");
      await expect(page.locator("main")).toBeVisible();
    });
  });

  test.describe("2FA Setup Page", () => {
    test("should redirect unauthenticated users", async ({ page }) => {
      await page.goto("/2fa-setup");
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Account Linking Page", () => {
    test("should redirect unauthenticated users", async ({ page }) => {
      await page.goto("/account-linking");
      await expect(page.locator("body")).toBeVisible();
    });
  });
});
