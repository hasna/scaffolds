// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock openapi
vi.mock("@/lib/openapi", () => ({
  openApiSpec: {
    openapi: "3.1.0",
    info: {
      title: "Test API",
      version: "1.0.0",
    },
    paths: {},
  },
}));

import { GET } from "./route";

describe("Docs route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/docs", () => {
    it("should return OpenAPI spec", async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.openapi).toBe("3.1.0");
      expect(data.info).toBeDefined();
      expect(data.info.title).toBe("Test API");
      expect(data.paths).toBeDefined();
    });
  });
});
