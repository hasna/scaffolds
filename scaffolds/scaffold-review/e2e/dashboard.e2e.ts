import { test, expect } from "@playwright/test";

test.describe("Dashboard Pages (Require Auth)", () => {
  test.describe("Dashboard Main", () => {
    test("should redirect to login when not authenticated", async ({ page }) => {
      await page.goto("/dashboard");
      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe("Team Page", () => {
    test("should redirect to login when not authenticated", async ({ page }) => {
      await page.goto("/dashboard/team");
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe("Settings Page", () => {
    test("should redirect to login when not authenticated", async ({ page }) => {
      await page.goto("/dashboard/settings");
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe("API Keys Page", () => {
    test("should redirect to login when not authenticated", async ({ page }) => {
      await page.goto("/dashboard/api-keys");
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe("Webhooks Page", () => {
    test("should redirect to login when not authenticated", async ({ page }) => {
      await page.goto("/dashboard/webhooks");
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe("Billing Page", () => {
    test("should redirect to login when not authenticated", async ({ page }) => {
      await page.goto("/dashboard/billing");
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe("Analytics Page", () => {
    test("should redirect to login when not authenticated", async ({ page }) => {
      await page.goto("/dashboard/analytics");
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe("Assistant Page", () => {
    test("should redirect to login when not authenticated", async ({ page }) => {
      await page.goto("/dashboard/assistant");
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe("Onboarding Page", () => {
    test("should redirect to login when not authenticated", async ({ page }) => {
      await page.goto("/onboarding");
      await expect(page).toHaveURL(/login/);
    });
  });
});
