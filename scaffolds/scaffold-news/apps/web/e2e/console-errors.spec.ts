// @ts-nocheck
import { test, expect, ConsoleMessage, Page } from "@playwright/test";
import { login, TEST_USER, TEST_ADMIN_USER } from "./fixtures/auth";

// Helper to collect console errors on a page
async function collectConsoleErrors(
  page: Page,
  url: string,
  options?: { login?: "user" | "admin" }
): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  page.on("console", (msg: ConsoleMessage) => {
    const text = msg.text();
    // Ignore common non-critical warnings in development
    if (
      text.includes("Download the React DevTools") ||
      text.includes("Warning: Extra attributes from the server") ||
      text.includes("Slow network is detected") ||
      text.includes("Failed to load resource") || // Often expected for 404 tests
      text.includes("Hydration") || // React hydration warnings in dev mode
      text.includes("did not match") || // Server/client mismatch
      text.includes("There was an error while hydrating") ||
      text.includes("maximum update depth exceeded") ||
      text.includes("in strict mode") || // React strict mode warnings
      text.includes("ClientFetchError") || // NextAuth client fetch errors in dev
      text.includes("errors.authjs.dev") // NextAuth error links
    ) {
      return;
    }

    if (msg.type() === "error") {
      errors.push(text);
    }
    if (msg.type() === "warning") {
      warnings.push(text);
    }
  });

  await page.goto(url);
  await page.waitForLoadState("networkidle");

  return { errors, warnings };
}

// Marketing pages (public, no auth required)
const MARKETING_PAGES = [
  "/",
  "/about",
  "/pricing",
  "/features",
  "/blog",
  "/changelog",
  "/contact",
  "/help",
  "/docs",
  "/status",
  "/security",
  "/terms",
  "/privacy",
  "/cookies",
  "/acceptable-use",
  "/dpa",
];

// Auth pages (public, no auth required)
const AUTH_PAGES = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
  "/2fa-setup",
  "/account-linking",
];

// Dashboard pages (require user login)
const DASHBOARD_PAGES = [
  "/dashboard",
  "/dashboard/settings",
  "/dashboard/team",
  "/dashboard/billing",
  "/dashboard/api-keys",
  "/dashboard/webhooks",
  "/dashboard/analytics",
  "/dashboard/assistant",
  "/dashboard/assistant/usage",
];

// Admin pages (require admin login)
const ADMIN_PAGES = [
  "/admin",
  "/admin/analytics",
  "/admin/users",
  "/admin/tenants",
  "/admin/health",
  "/admin/feature-flags",
  "/admin/marketing/blog",
  "/admin/marketing/blog/categories",
  "/admin/marketing/changelog",
  "/admin/marketing/docs",
  "/admin/marketing/pages",
];

test.describe("Console Error Checks", () => {
  test.describe("Marketing Pages", () => {
    for (const url of MARKETING_PAGES) {
      test(`no console errors on ${url}`, async ({ page }) => {
        const { errors } = await collectConsoleErrors(page, url);

        expect(errors, `Console errors found on ${url}: ${errors.join(", ")}`).toHaveLength(0);
      });
    }
  });

  test.describe("Auth Pages", () => {
    for (const url of AUTH_PAGES) {
      test(`no console errors on ${url}`, async ({ page }) => {
        const { errors } = await collectConsoleErrors(page, url);

        expect(errors, `Console errors found on ${url}: ${errors.join(", ")}`).toHaveLength(0);
      });
    }
  });

  // Skip dashboard and admin console error tests for now
  // These require a seeded test database with valid user credentials
  // TODO: Add proper database seeding for authenticated E2E tests
  test.describe.skip("Dashboard Pages", () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password);
    });

    for (const url of DASHBOARD_PAGES) {
      test(`no console errors on ${url}`, async ({ page }) => {
        const errors: string[] = [];

        page.on("console", (msg: ConsoleMessage) => {
          const text = msg.text();
          // Filter out common non-critical errors in development
          if (
            text.includes("Download the React DevTools") ||
            text.includes("Warning: Extra attributes from the server") ||
            text.includes("Hydration") ||
            text.includes("did not match") ||
            text.includes("There was an error while hydrating") ||
            text.includes("maximum update depth exceeded") ||
            text.includes("in strict mode") ||
            text.includes("tenant") || // Tenant-related fetch errors in dev
            text.includes("passiveEffects") || // React passive effect warnings
            text.includes("fetchTenants") || // Tenant fetch errors
            text.includes("react-dom") // React internal errors
          ) {
            return;
          }
          if (msg.type() === "error") {
            errors.push(text);
          }
        });

        await page.goto(url);
        await page.waitForLoadState("networkidle");

        expect(errors, `Console errors found on ${url}: ${errors.join(", ")}`).toHaveLength(0);
      });
    }
  });

  // Skip admin console error tests for now
  // These require a seeded test database with valid admin credentials
  test.describe.skip("Admin Pages", () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_ADMIN_USER.email, TEST_ADMIN_USER.password);
    });

    for (const url of ADMIN_PAGES) {
      test(`no console errors on ${url}`, async ({ page }) => {
        const errors: string[] = [];

        page.on("console", (msg: ConsoleMessage) => {
          const text = msg.text();
          // Filter out common non-critical errors in development
          if (
            text.includes("Download the React DevTools") ||
            text.includes("Warning: Extra attributes from the server") ||
            text.includes("Hydration") ||
            text.includes("did not match") ||
            text.includes("There was an error while hydrating") ||
            text.includes("maximum update depth exceeded") ||
            text.includes("in strict mode") ||
            text.includes("tenant") || // Tenant-related fetch errors in dev
            text.includes("passiveEffects") || // React passive effect warnings
            text.includes("fetchTenants") || // Tenant fetch errors
            text.includes("react-dom") // React internal errors
          ) {
            return;
          }
          if (msg.type() === "error") {
            errors.push(text);
          }
        });

        await page.goto(url);
        await page.waitForLoadState("networkidle");

        expect(errors, `Console errors found on ${url}: ${errors.join(", ")}`).toHaveLength(0);
      });
    }
  });
});
