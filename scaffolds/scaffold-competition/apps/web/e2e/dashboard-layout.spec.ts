import { test, expect } from "@playwright/test";
import { login, TEST_USER } from "./fixtures/auth";

// Skip layout tests for now - requires seeded test database with valid user credentials
// TODO: Enable these tests after database seeding is implemented
test.describe.skip("Dashboard Layout - shadcn dashboard-01", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto("/dashboard");
  });

  test.describe("Sidebar", () => {
    test("sidebar is visible on desktop", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });

      // Sidebar should be visible
      await expect(page.locator('[data-slot="sidebar"]')).toBeVisible();
    });

    test("sidebar can be collapsed", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });

      // Find and click the sidebar toggle
      const toggleButton = page.locator('[data-slot="sidebar-trigger"]');

      if (await toggleButton.isVisible()) {
        await toggleButton.click();

        // Sidebar should still be visible but in collapsed state
        await expect(page.locator('[data-slot="sidebar"]')).toBeVisible();
      }
    });

    test("sidebar shows as drawer on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Mobile trigger should be visible
      const mobileTrigger = page.locator('[data-slot="sidebar-trigger"]');
      await expect(mobileTrigger).toBeVisible();

      // Click to open drawer
      await mobileTrigger.click();

      // Sidebar should appear as drawer
      await expect(page.locator('[data-slot="sidebar"]')).toBeVisible();
    });
  });

  test.describe("Navigation", () => {
    test("can navigate to dashboard pages via sidebar", async ({ page }) => {
      // Click on Settings in sidebar
      await page.locator('a[href="/dashboard/settings"]').click();
      await expect(page).toHaveURL(/.*\/dashboard\/settings/);
      await expect(page.locator("text=Settings").first()).toBeVisible();

      // Click on Team
      await page.locator('a[href="/dashboard/team"]').click();
      await expect(page).toHaveURL(/.*\/dashboard\/team/);
      await expect(page.locator("text=Team").first()).toBeVisible();
    });

    test("active navigation item is highlighted", async ({ page }) => {
      await page.goto("/dashboard/settings");

      const activeLink = page.locator('a[href="/dashboard/settings"]');
      // Check for active state styling (usually has data-active or aria-current)
      await expect(activeLink).toHaveAttribute("data-active", "true");
    });
  });

  test.describe("User Menu", () => {
    test("user dropdown menu works", async ({ page }) => {
      // Find user menu trigger in sidebar footer
      const userMenuTrigger = page.locator('[data-slot="sidebar-menu-button"]').last();

      if (await userMenuTrigger.isVisible()) {
        await userMenuTrigger.click();

        // Dropdown should appear with options
        await expect(page.locator("text=Account")).toBeVisible();
        await expect(page.locator("text=Log out")).toBeVisible();
      }
    });
  });

  test.describe("Stats Cards", () => {
    test("stats cards are displayed", async ({ page }) => {
      await page.goto("/dashboard");

      // Should show stat cards
      const cards = page.locator('[class*="card"]');
      await expect(cards.first()).toBeVisible();
    });

    test("stats cards show trend indicators", async ({ page }) => {
      await page.goto("/dashboard");

      // Should show trend badges
      const badges = page.locator('[class*="badge"]');
      await expect(badges.first()).toBeVisible();
    });
  });

  test.describe("Chart", () => {
    test("chart is rendered", async ({ page }) => {
      await page.goto("/dashboard");

      // Should show chart container
      const chartContainer = page.locator('[class*="recharts"]');
      await expect(chartContainer).toBeVisible();
    });

    test("chart time range selector works", async ({ page }) => {
      await page.goto("/dashboard");

      // Find and click the time range selector
      const selector = page.locator('button:has-text("Last 7 days")');

      if (await selector.isVisible()) {
        await selector.click();

        // Options should appear
        await expect(page.locator("text=Last 30 days")).toBeVisible();
        await expect(page.locator("text=Last 3 months")).toBeVisible();
      }
    });
  });

  test.describe("Responsive Layout", () => {
    test("layout adapts to tablet size", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/dashboard");

      // Content should be visible
      await expect(page.locator("text=Welcome back").first()).toBeVisible();
    });

    test("layout adapts to mobile size", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/dashboard");

      // Content should be visible
      await expect(page.locator("text=Welcome back").first()).toBeVisible();

      // Stats cards should stack vertically (check grid)
      const cardGrid = page.locator('[class*="grid"]').first();
      await expect(cardGrid).toBeVisible();
    });
  });
});
