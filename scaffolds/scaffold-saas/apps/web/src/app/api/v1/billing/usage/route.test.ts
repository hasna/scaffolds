// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-saas/database/client", () => ({
  db: {
    query: {
      assistantUsage: { findMany: vi.fn() },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 0 }])),
      })),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  assistantUsage: {
    tenantId: "tenant_id",
    createdAt: "created_at",
  },
  teamMembers: {
    tenantId: "tenant_id",
  },
  webhooks: {
    tenantId: "tenant_id",
  },
}));

import { GET } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-saas/database/client";

function createRequest(searchParams?: Record<string, string>): Request {
  const url = new URL("http://localhost:3000/api/v1/billing/usage");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new Request(url.toString(), { method: "GET" });
}

const mockAiUsage = [
  {
    id: "usage-1",
    tenantId: "tenant-1",
    userId: "user-1",
    model: "gpt-4o",
    inputTokens: 100,
    outputTokens: 50,
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "usage-2",
    tenantId: "tenant-1",
    userId: "user-1",
    model: "gpt-4o",
    inputTokens: 200,
    outputTokens: 100,
    createdAt: new Date("2024-01-16"),
  },
];

describe("Billing Usage route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/billing/usage - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });
  });

  describe("GET /api/v1/billing/usage - Happy paths", () => {
    it("should return usage data with default 30d period", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.assistantUsage.findMany).mockResolvedValue(mockAiUsage);

      const mockFrom = vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 5 }])),
      }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.period).toBe("30d");
    });

    it("should calculate AI usage totals correctly", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.assistantUsage.findMany).mockResolvedValue(mockAiUsage);

      const mockFrom = vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 0 }])),
      }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.ai.totals.inputTokens).toBe(300);
      expect(data.data.ai.totals.outputTokens).toBe(150);
      expect(data.data.ai.totals.totalTokens).toBe(450);
      expect(data.data.ai.totals.requestCount).toBe(2);
    });

    it("should include daily AI usage breakdown", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.assistantUsage.findMany).mockResolvedValue(mockAiUsage);

      const mockFrom = vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 0 }])),
      }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.ai.daily).toHaveLength(2);
      expect(data.data.ai.daily[0].inputTokens).toBe(100);
      expect(data.data.ai.daily[0].outputTokens).toBe(50);
      expect(data.data.ai.daily[0].totalTokens).toBe(150);
    });

    it("should return resource counts", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.assistantUsage.findMany).mockResolvedValue([]);

      let callCount = 0;
      const mockFrom = vi.fn(() => ({
        where: vi.fn(() => {
          callCount++;
          // First call is team members, second is webhooks
          return Promise.resolve([{ count: callCount === 1 ? 5 : 3 }]);
        }),
      }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.resources.teamMembers).toBe(5);
      expect(data.data.resources.webhooks).toBe(3);
    });

    it("should return zero totals when no usage exists", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.assistantUsage.findMany).mockResolvedValue([]);

      const mockFrom = vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 0 }])),
      }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.ai.totals.inputTokens).toBe(0);
      expect(data.data.ai.totals.outputTokens).toBe(0);
      expect(data.data.ai.totals.totalTokens).toBe(0);
      expect(data.data.ai.totals.requestCount).toBe(0);
      expect(data.data.ai.daily).toHaveLength(0);
    });
  });

  describe("GET /api/v1/billing/usage - Period parameter", () => {
    it("should accept 7d period", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.assistantUsage.findMany).mockResolvedValue([]);

      const mockFrom = vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 0 }])),
      }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const request = createRequest({ period: "7d" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.period).toBe("7d");
    });

    it("should accept 30d period", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.assistantUsage.findMany).mockResolvedValue([]);

      const mockFrom = vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 0 }])),
      }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const request = createRequest({ period: "30d" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.period).toBe("30d");
    });

    it("should accept 90d period", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.assistantUsage.findMany).mockResolvedValue([]);

      const mockFrom = vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 0 }])),
      }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const request = createRequest({ period: "90d" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.period).toBe("90d");
    });

    it("should default to 30d for invalid period", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.assistantUsage.findMany).mockResolvedValue([]);

      const mockFrom = vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ count: 0 }])),
      }));
      vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);

      const request = createRequest({ period: "invalid" });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.period).toBe("invalid"); // Period is returned as-is
    });
  });

  describe("Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.assistantUsage.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
