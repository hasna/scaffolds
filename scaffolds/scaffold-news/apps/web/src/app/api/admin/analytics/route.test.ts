// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock database - create a comprehensive mock for Drizzle query chain
vi.mock("@scaffold-news/database/client", () => {
  const mockQueryResult = [{ count: 0, mrr: 0 }];

  const createChain = () => ({
    select: vi.fn(() => createChain()),
    from: vi.fn(() => createChain()),
    where: vi.fn(() => Promise.resolve(mockQueryResult)),
    innerJoin: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve([{ mrr: 0 }])),
    })),
  });

  return {
    db: createChain(),
  };
});

// Mock schema
vi.mock("@scaffold-news/database/schema", () => ({
  users: { createdAt: "created_at" },
  tenants: { createdAt: "created_at" },
  subscriptions: { status: "status", planId: "plan_id" },
  pricingPlans: { id: "id", priceMonthly: "price_monthly" },
  sessions: { userId: "user_id", expiresAt: "expires_at" },
  auditLogs: { createdAt: "created_at" },
  assistantMessages: { createdAt: "created_at" },
}));

import { GET } from "./route";
import { auth } from "@/lib/auth";

describe("Admin analytics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/analytics - Authorization", () => {
    it("should return 403 when user is not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when user is not an admin", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          role: "user",
          email: "user@example.com",
        },
        expires: new Date().toISOString(),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should return 403 when user has no id", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "",
          role: "admin",
          email: "admin@example.com",
        },
        expires: new Date().toISOString(),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });

    it("should reject super_admin users (only admin role allowed)", async () => {
      // Note: The route only checks for role === "admin", not super_admin
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "super-1",
          role: "super_admin",
          email: "super@example.com",
        },
        expires: new Date().toISOString(),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });
});
