import { beforeAll, afterAll, vi } from "vitest";

// Mock environment variables
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.NEXTAUTH_URL = "http://localhost:5900";

// Mock console methods to reduce noise in tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "debug").mockImplementation(() => {});
vi.spyOn(console, "info").mockImplementation(() => {});

beforeAll(() => {
  // Global setup
});

afterAll(() => {
  // Global teardown
});
