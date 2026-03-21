// @ts-nocheck
import { test, expect } from "@playwright/test";
import { login, TEST_USER } from "./fixtures/auth";

test.describe("Onboarding Page", () => {
  // Skip authenticated tests for now - requires seeded test database with valid user credentials
  // TODO: Add proper database seeding for authenticated E2E tests
  test.describe.skip("User with existing team", () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password);
    });

    test("redirects to dashboard if user has a team", async ({ page }) => {
      await page.goto("/onboarding");

      // Should redirect to dashboard since test user has a tenant
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    });
  });

  test.describe("Unauthenticated access", () => {
    test("redirects to login if not authenticated", async ({ page }) => {
      await page.goto("/onboarding");

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });
});
