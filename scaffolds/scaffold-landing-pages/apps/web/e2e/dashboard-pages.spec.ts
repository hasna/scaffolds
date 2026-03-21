// @ts-nocheck
import { test, expect } from "@playwright/test";
import { login, TEST_USER } from "./fixtures/auth";

// Skip dashboard tests for now - requires seeded test database with valid user credentials
// TODO: Add proper database seeding for authenticated E2E tests
test.describe.skip("Dashboard Pages", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test.describe("Dashboard Home", () => {
    test("renders the dashboard", async ({ page }) => {
      await page.goto("/dashboard");

      // Should show dashboard content
      await expect(page.locator("text=Dashboard").first()).toBeVisible();
    });
  });

  test.describe("Dashboard Settings", () => {
    test("renders the settings page", async ({ page }) => {
      await page.goto("/dashboard/settings");

      await expect(page.locator("text=Settings").first()).toBeVisible();
    });
  });

  test.describe("Dashboard Team", () => {
    test("renders the team page", async ({ page }) => {
      await page.goto("/dashboard/team");

      await expect(page.locator("text=Team").first()).toBeVisible();
    });
  });

  test.describe("Dashboard Billing", () => {
    test("renders the billing page", async ({ page }) => {
      await page.goto("/dashboard/billing");

      await expect(page.locator("text=Billing").first()).toBeVisible();
    });
  });

  test.describe("Dashboard API Keys", () => {
    test("renders the api-keys page", async ({ page }) => {
      await page.goto("/dashboard/api-keys");

      await expect(page.locator("text=API").first()).toBeVisible();
    });
  });

  test.describe("Dashboard Webhooks", () => {
    test("renders the webhooks page", async ({ page }) => {
      await page.goto("/dashboard/webhooks");

      await expect(page.locator("text=Webhooks").first()).toBeVisible();
    });
  });

  test.describe("Dashboard Analytics", () => {
    test("renders the analytics page", async ({ page }) => {
      await page.goto("/dashboard/analytics");

      await expect(page.locator("text=Analytics").first()).toBeVisible();
    });
  });

  test.describe("Dashboard Assistant", () => {
    test("renders the assistant page", async ({ page }) => {
      await page.goto("/dashboard/assistant");

      await expect(page.locator("text=Assistant").first()).toBeVisible();
    });

    test("renders the assistant usage page", async ({ page }) => {
      await page.goto("/dashboard/assistant/usage");

      await expect(page.locator("text=Usage").first()).toBeVisible();
    });
  });
});
