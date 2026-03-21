/* eslint-disable react-hooks/rules-of-hooks */
import { test as base, expect, Page } from "@playwright/test";
import { testUser, adminUser, testTenant } from "./test-data";

// Extend base test with custom fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
  unauthenticatedPage: Page;
}>({
  // Authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login
    await page.goto("/login");

    // Fill in credentials
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);

    // Submit and wait for redirect
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    await use(page);
  },

  // Admin page fixture
  adminPage: async ({ page }, use) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', adminUser.email);
    await page.fill('input[name="password"]', adminUser.password);

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    await use(page);
  },

  // Unauthenticated page fixture
  unauthenticatedPage: async ({ page }, use) => {
    // Just provide a fresh page
    await use(page);
  },
});

export { expect };

// Helper to generate unique test email
export function generateTestEmail(prefix: string = "test"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}-${timestamp}-${random}@test.example.com`;
}

// Helper to wait for toast message
export async function waitForToast(page: Page, text: string): Promise<void> {
  await page.waitForSelector(`text=${text}`, { timeout: 10000 });
}

// Helper to fill form fields
export async function fillForm(page: Page, fields: Record<string, string>): Promise<void> {
  for (const [name, value] of Object.entries(fields)) {
    await page.fill(`input[name="${name}"], textarea[name="${name}"]`, value);
  }
}

// Helper to check if element is visible
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  return element.isVisible();
}

// Helper to get text content
export async function getText(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector);
  return (await element.textContent()) ?? "";
}

// API helper for seeding test data
export async function seedTestUser(request: any): Promise<void> {
  await request.post("/api/test/seed", {
    data: {
      type: "user",
      ...testUser,
    },
  });
}

export async function seedTestTenant(request: any): Promise<void> {
  await request.post("/api/test/seed", {
    data: {
      type: "tenant",
      ...testTenant,
    },
  });
}

// Cleanup helper
export async function cleanupTestData(request: any): Promise<void> {
  await request.post("/api/test/cleanup", {
    data: {
      emails: [testUser.email, adminUser.email],
    },
  });
}
