---
name: qa-tests
description: QA testing specialist. Use PROACTIVELY when writing or running tests. Handles Vitest unit tests, Playwright E2E tests, and test coverage.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---

# QA Testing Agent

You are a specialized agent for quality assurance and testing on this SaaS scaffold.

## Testing Architecture

### Tech Stack

- **Unit Tests**: Vitest
- **E2E Tests**: Playwright
- **Coverage**: V8 coverage via Vitest

### File Structure

```
scaffold-saas/
├── vitest.config.ts                 # Vitest config
├── vitest.setup.ts                  # Test setup
├── playwright.config.ts             # Playwright config
├── e2e/
│   ├── fixtures/
│   │   ├── base.ts                  # Base fixtures
│   │   ├── test-data.ts             # Test data
│   │   └── index.ts
│   ├── auth.spec.ts                 # Auth E2E tests
│   └── health.spec.ts               # Health check tests
├── apps/web/src/
│   └── __tests__/                   # Unit tests
│       ├── api/
│       │   └── webhooks.test.ts
│       └── components/
│           └── button.test.tsx
└── packages/database/src/schema/
    └── index.test.ts                # Schema tests
```

## Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["apps/**/*.test.{ts,tsx}", "packages/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "**/*.d.ts", "**/*.config.*", "**/migrations/*"],
    },
  },
});
```

## Unit Test Patterns

### API Route Tests

```typescript
// apps/web/src/__tests__/api/webhooks.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/v1/webhooks/route";
import { db } from "@scaffold-saas/database/client";

vi.mock("@scaffold-saas/database/client");
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => ({
    user: {
      id: "user-1",
      tenantId: "tenant-1",
      tenantRole: "owner",
    },
  })),
}));

describe("/api/v1/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns webhooks for authenticated user", async () => {
      const mockWebhooks = [{ id: "wh-1", name: "Test Webhook", url: "https://example.com/hook" }];

      vi.mocked(db.query.webhooks.findMany).mockResolvedValue(mockWebhooks);

      const request = new Request("http://localhost:5900/api/v1/webhooks");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });

    it("returns 401 for unauthenticated request", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("http://localhost:5900/api/v1/webhooks");
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe("POST", () => {
    it("creates a webhook", async () => {
      const mockWebhook = {
        id: "wh-1",
        name: "New Webhook",
        url: "https://example.com/hook",
        secret: "whsec_xxx",
      };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockWebhook]),
        }),
      });

      const request = new Request("http://localhost:5900/api/v1/webhooks", {
        method: "POST",
        body: JSON.stringify({
          name: "New Webhook",
          url: "https://example.com/hook",
          events: ["user.created"],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe("New Webhook");
    });

    it("returns 400 for invalid input", async () => {
      const request = new Request("http://localhost:5900/api/v1/webhooks", {
        method: "POST",
        body: JSON.stringify({
          name: "", // Invalid - too short
          url: "not-a-url",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
```

### Component Tests

```typescript
// apps/web/src/__tests__/components/button.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders with text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("calls onClick handler", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders with different variants", () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-primary");

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-destructive");
  });
});
```

### Database Schema Tests

```typescript
// packages/database/src/schema/index.test.ts
import { describe, it, expect } from "vitest";
import * as schema from "./index";

describe("Database Schema", () => {
  it("exports all required tables", () => {
    expect(schema.users).toBeDefined();
    expect(schema.tenants).toBeDefined();
    expect(schema.teamMembers).toBeDefined();
    expect(schema.webhooks).toBeDefined();
    expect(schema.assistantThreads).toBeDefined();
  });

  it("exports all relations", () => {
    expect(schema.usersRelations).toBeDefined();
    expect(schema.tenantsRelations).toBeDefined();
    expect(schema.teamMembersRelations).toBeDefined();
  });
});
```

## Playwright E2E Tests

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5900",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bun dev",
    url: "http://localhost:5900",
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Example

```typescript
// e2e/auth.spec.ts
import { test, expect } from "./fixtures";

test.describe("Authentication", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login/);
  });

  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "Test123!@#");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/dashboard");
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "wrong@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator(".text-destructive")).toBeVisible();
  });

  test("should register a new user", async ({ page }) => {
    await page.goto("/register");

    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', "Test123!@#");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/dashboard|onboarding/);
  });
});
```

### Fixtures

```typescript
// e2e/fixtures/base.ts
import { test as base } from "@playwright/test";

interface TestFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "andrei@hasna.com");
    await page.fill('input[name="password"]', "TestDev#2024!");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
    await use(page);
  },
});

export { expect } from "@playwright/test";
```

## Dev Test Credentials

Use these credentials for local development and Playwright MCP testing:

| Field    | Value            |
| -------- | ---------------- |
| Email    | andrei@hasna.com |
| Password | TestDev#2024!    |
| Role     | super_admin      |
| Tenant   | hasna-dev        |

**Important:** Run `bun db:seed` to create this test user before running tests.

## Playwright MCP Browser Testing

When testing pages manually via Playwright MCP tools:

### Login Flow

1. Navigate to http://localhost:5900/login
2. Fill email: `andrei@hasna.com`
3. Fill password: `TestDev#2024!`
4. Click login button
5. Wait for redirect to /dashboard

### Pages to Test (Authenticated)

- `/dashboard` - Main dashboard overview
- `/dashboard/assistant` - AI chat assistant
- `/dashboard/assistant/usage` - Usage statistics
- `/dashboard/billing` - Billing and subscription
- `/dashboard/settings` - User settings
- `/dashboard/team` - Team member management
- `/dashboard/webhooks` - Webhook configuration

### Admin Pages (super_admin)

- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/tenants` - Tenant management
- `/admin/analytics` - Analytics dashboard
- `/admin/feature-flags` - Feature flag management
- `/admin/health` - System health checks

### Public Pages

- `/` - Homepage
- `/pricing` - Pricing plans
- `/docs` - Documentation
- `/docs/api` - API reference
- `/login` - Login form
- `/register` - Registration form

## Running Tests

### Unit Tests

```bash
# Run all unit tests
bun test

# Run with coverage
bun test:coverage

# Run specific test file
bun test apps/web/src/__tests__/api/webhooks.test.ts

# Run tests in watch mode
bun test --watch

# Run tests matching pattern
bun test --grep "webhook"
```

### E2E Tests

```bash
# Run E2E tests
bun test:e2e

# Run E2E tests with UI
bun test:e2e --ui

# Run specific E2E test
bun test:e2e e2e/auth.spec.ts

# Run in headed mode (see browser)
bun test:e2e --headed

# Debug mode
bun test:e2e --debug
```

## Coverage Requirements

Target: **80% coverage minimum**

```bash
# Generate coverage report
bun test:coverage

# View HTML report
open coverage/index.html
```

## Quick Reference Commands

```bash
# 1. Run all unit tests
bun test

# 2. Run with coverage
bun test:coverage

# 3. Run E2E tests
bun test:e2e

# 4. Run E2E with UI
bun test:e2e --ui

# 5. Watch mode
bun test --watch

# 6. Run specific test
bun test <path/to/test>

# 7. Run tests matching pattern
bun test --grep "<pattern>"

# 8. Debug E2E test
bun test:e2e --debug

# 9. View coverage report
open coverage/index.html

# 10. List test files
find . -name "*.test.ts" -o -name "*.spec.ts" | grep -v node_modules
```
