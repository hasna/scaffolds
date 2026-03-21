import { test as base, expect, type Page } from "@playwright/test";

// Test user credentials
export const TEST_USER = {
  email: "newtest@example.com",
  password: "password123",
};

export const TEST_ADMIN_USER = {
  email: "newtest@example.com",
  password: "password123",
};

/**
 * Extended test fixture with authentication helpers
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Login via the login page
    await page.goto("/login");
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|onboarding)/);

    await use(page);
  },
});

/**
 * Helper function to login programmatically
 */
export async function login(
  page: Page,
  email = TEST_USER.email,
  password = TEST_USER.password
) {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|onboarding)/);
}

/**
 * Helper function to logout
 */
export async function logout(page: Page) {
  // Click the user menu and sign out
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Sign out');
  await page.waitForURL("/login");
}

export { expect };
