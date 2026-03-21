// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database client
vi.mock("@scaffold-social/database/client", () => ({
  db: {
    execute: vi.fn(),
  },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray) => strings[0],
}));

import { GET } from "./route";
import { db } from "@scaffold-social/database/client";

describe("Health check route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear REDIS_URL for most tests
    delete process.env.REDIS_URL;
  });

  describe("GET /api/health", () => {
    it("should return healthy status when database is up", async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("healthy");
      expect(data.services.database.status).toBe("up");
      expect(data.services.database.latencyMs).toBeDefined();
    });

    it("should return unhealthy status when database is down", async () => {
      vi.mocked(db.execute).mockRejectedValue(new Error("Database connection failed"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe("unhealthy");
      expect(data.services.database.status).toBe("down");
      expect(data.services.database.error).toBe("Database connection failed");
    });

    it("should include timestamp in response", async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      // Verify it's a valid ISO timestamp
      expect(() => new Date(data.timestamp)).not.toThrow();
    });

    it("should include version in response", async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(data.version).toBeDefined();
    });

    it("should return proper health structure", async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("services");
      expect(data.services).toHaveProperty("database");
    });

    it("should handle unknown database errors", async () => {
      vi.mocked(db.execute).mockRejectedValue("string error");

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe("unhealthy");
      expect(data.services.database.error).toBe("Unknown error");
    });

    it("should measure database latency", async () => {
      vi.mocked(db.execute).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 10))
      );

      const response = await GET();
      const data = await response.json();

      expect(data.services.database.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Response status codes", () => {
    it("should return 200 for healthy status", async () => {
      vi.mocked(db.execute).mockResolvedValue([]);

      const response = await GET();

      expect(response.status).toBe(200);
    });

    it("should return 503 for unhealthy status", async () => {
      vi.mocked(db.execute).mockRejectedValue(new Error("DB down"));

      const response = await GET();

      expect(response.status).toBe(503);
    });
  });
});
