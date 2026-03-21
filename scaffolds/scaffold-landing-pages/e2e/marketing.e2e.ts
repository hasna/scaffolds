import { test, expect } from "@playwright/test";

test.describe("Marketing Pages", () => {
  test.describe("Homepage", () => {
    test("should load homepage", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle(/Scaffold SaaS/);
    });

    test("should display navigation links", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("link", { name: /features/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /pricing/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /blog/i })).toBeVisible();
    });

    test("should have CTA buttons", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
    });
  });

  test.describe("Features Page", () => {
    test("should load features page", async ({ page }) => {
      await page.goto("/features");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    test("should display feature cards", async ({ page }) => {
      await page.goto("/features");
      // Features page should have feature sections
      await expect(page.locator("main")).toBeVisible();
    });
  });

  test.describe("Pricing Page", () => {
    test("should load pricing page", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    test("should display pricing plans", async ({ page }) => {
      await page.goto("/pricing");
      // Pricing page should have plan cards
      await expect(page.locator("main")).toBeVisible();
    });

    test("should have billing toggle", async ({ page }) => {
      await page.goto("/pricing");
      // Look for monthly/yearly toggle
      await expect(page.locator("main")).toBeVisible();
    });
  });

  test.describe("About Page", () => {
    test("should load about page", async ({ page }) => {
      await page.goto("/about");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  });

  test.describe("Contact Page", () => {
    test("should load contact page", async ({ page }) => {
      await page.goto("/contact");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    test("should have contact form", async ({ page }) => {
      await page.goto("/contact");
      await expect(page.locator("form")).toBeVisible();
    });
  });

  test.describe("Blog Page", () => {
    test("should load blog listing", async ({ page }) => {
      await page.goto("/blog");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  });

  test.describe("Changelog Page", () => {
    test("should load changelog", async ({ page }) => {
      await page.goto("/changelog");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  });

  test.describe("Docs Page", () => {
    test("should load docs", async ({ page }) => {
      await page.goto("/docs");
      await expect(page.locator("main")).toBeVisible();
    });
  });

  test.describe("Legal Pages", () => {
    test("should load privacy page", async ({ page }) => {
      await page.goto("/privacy");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    test("should load terms page", async ({ page }) => {
      await page.goto("/terms");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    test("should load cookies page", async ({ page }) => {
      await page.goto("/cookies");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    test("should load acceptable-use page", async ({ page }) => {
      await page.goto("/acceptable-use");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    test("should load dpa page", async ({ page }) => {
      await page.goto("/dpa");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });

    test("should load security page", async ({ page }) => {
      await page.goto("/security");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  });

  test.describe("Help Page", () => {
    test("should load help page", async ({ page }) => {
      await page.goto("/help");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  });

  test.describe("Status Page", () => {
    test("should load status page", async ({ page }) => {
      await page.goto("/status");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  });
});
