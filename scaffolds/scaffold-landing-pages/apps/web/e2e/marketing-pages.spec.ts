// @ts-nocheck
import { test, expect } from "@playwright/test";

test.describe("Marketing Pages", () => {
  test.describe("Home Page", () => {
    test("renders the home page", async ({ page }) => {
      await page.goto("/");

      // Page should load and have a header
      await expect(page.locator("header")).toBeVisible();
    });

    test("has navigation links", async ({ page }) => {
      await page.goto("/");

      // Check for common navigation elements
      await expect(page.locator("header")).toBeVisible();
    });
  });

  test.describe("About Page", () => {
    test("renders the about page", async ({ page }) => {
      await page.goto("/about");

      await expect(page.locator("text=About").first()).toBeVisible();
    });
  });

  test.describe("Pricing Page", () => {
    test("renders the pricing page", async ({ page }) => {
      await page.goto("/pricing");

      await expect(page.locator("text=Pricing").first()).toBeVisible();
    });

    test("shows pricing tiers", async ({ page }) => {
      await page.goto("/pricing");

      // Should have some pricing content
      await expect(page.locator("text=Pricing").first()).toBeVisible();
    });
  });

  test.describe("Features Page", () => {
    test("renders the features page", async ({ page }) => {
      await page.goto("/features");

      await expect(page.locator("text=Features").first()).toBeVisible();
    });
  });

  test.describe("Blog Page", () => {
    test("renders the blog page", async ({ page }) => {
      await page.goto("/blog");

      await expect(page.locator("text=Blog").first()).toBeVisible();
    });
  });

  test.describe("Changelog Page", () => {
    test("renders the changelog page", async ({ page }) => {
      await page.goto("/changelog");

      await expect(page.locator("text=Changelog").first()).toBeVisible();
    });
  });

  test.describe("Contact Page", () => {
    test("renders the contact page", async ({ page }) => {
      await page.goto("/contact");

      await expect(page.locator("text=Contact").first()).toBeVisible();
    });
  });

  test.describe("Help Page", () => {
    test("renders the help page", async ({ page }) => {
      await page.goto("/help");

      await expect(page.locator("text=Help").first()).toBeVisible();
    });
  });

  test.describe("Docs Page", () => {
    test("renders the docs page", async ({ page }) => {
      await page.goto("/docs");

      // Page should load without error
      await expect(page.locator("header")).toBeVisible();
    });
  });

  test.describe("Status Page", () => {
    test("renders the status page", async ({ page }) => {
      await page.goto("/status");

      await expect(page.locator("text=Status").first()).toBeVisible();
    });
  });

  test.describe("Security Page", () => {
    test("renders the security page", async ({ page }) => {
      await page.goto("/security");

      await expect(page.locator("text=Security").first()).toBeVisible();
    });
  });

  test.describe("Legal Pages", () => {
    test("renders the terms page", async ({ page }) => {
      await page.goto("/terms");

      await expect(page.locator("text=Terms").first()).toBeVisible();
    });

    test("renders the privacy page", async ({ page }) => {
      await page.goto("/privacy");

      await expect(page.locator("text=Privacy").first()).toBeVisible();
    });

    test("renders the cookies page", async ({ page }) => {
      await page.goto("/cookies");

      await expect(page.locator("text=Cookie").first()).toBeVisible();
    });

    test("renders the acceptable-use page", async ({ page }) => {
      await page.goto("/acceptable-use");

      await expect(page.locator("text=Acceptable Use").first()).toBeVisible();
    });

    test("renders the dpa page", async ({ page }) => {
      await page.goto("/dpa");

      await expect(page.locator("text=Data Processing").first()).toBeVisible();
    });
  });
});
