// @ts-nocheck
import { test, expect } from "@playwright/test";
import { login, TEST_USER } from "./fixtures/auth";

// Skip new team page tests for now - requires seeded test database with valid user credentials
// TODO: Add proper database seeding for authenticated E2E tests
test.describe.skip("New Team Page", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test.describe("Page Rendering", () => {
    test("renders the new team page", async ({ page }) => {
      await page.goto("/dashboard/settings/team/new");

      await expect(
        page.locator("text=Create a New Team").first()
      ).toBeVisible();
    });

    test("shows team name input", async ({ page }) => {
      await page.goto("/dashboard/settings/team/new");

      await expect(page.getByLabel("Team Name")).toBeVisible();
    });

    test("shows team URL input", async ({ page }) => {
      await page.goto("/dashboard/settings/team/new");

      await expect(page.getByLabel("Team URL")).toBeVisible();
    });

    test("shows back to dashboard link", async ({ page }) => {
      await page.goto("/dashboard/settings/team/new");

      await expect(
        page.getByRole("link", { name: "Back to Dashboard" })
      ).toBeVisible();
    });

    test("shows create and cancel buttons", async ({ page }) => {
      await page.goto("/dashboard/settings/team/new");

      await expect(
        page.getByRole("button", { name: "Create Team" })
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Cancel" })).toBeVisible();
    });
  });

  test.describe("Form Interaction", () => {
    test("auto-generates slug from team name", async ({ page }) => {
      await page.goto("/dashboard/settings/team/new");

      await page.getByLabel("Team Name").fill("My Test Team");

      // Slug should be auto-generated
      await expect(page.getByLabel("Team URL")).toHaveValue("my-test-team");
    });

    test("create button is disabled when form is empty", async ({ page }) => {
      await page.goto("/dashboard/settings/team/new");

      const createButton = page.getByRole("button", { name: "Create Team" });
      await expect(createButton).toBeDisabled();
    });

    test("create button is enabled when form is filled", async ({ page }) => {
      await page.goto("/dashboard/settings/team/new");

      await page.getByLabel("Team Name").fill("My Test Team");

      const createButton = page.getByRole("button", { name: "Create Team" });
      await expect(createButton).toBeEnabled();
    });
  });
});
