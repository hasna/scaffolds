// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// Mock tenant functions
vi.mock("@/lib/tenant", () => ({
  checkApiKeyLimit: vi.fn(),
}));

// Mock utils
vi.mock("@scaffold-landing-pages/utils", () => ({
  generateRandomString: vi.fn(() => "test-random-string-32chars"),
}));

// Mock database
vi.mock("@scaffold-landing-pages/database/client", () => ({
  db: {
    query: {
      apiKeys: { findMany: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-landing-pages/database/schema", () => ({
  API_KEY_SCOPES: [
    "read",
    "write",
    "team:read",
    "team:manage",
    "billing:read",
    "billing:manage",
    "assistant:use",
    "webhooks:manage",
  ],
  apiKeys: {
    id: "id",
    tenantId: "tenant_id",
    userId: "user_id",
    name: "name",
    keyPrefix: "key_prefix",
    keyHash: "key_hash",
    lastUsedAt: "last_used_at",
    expiresAt: "expires_at",
    createdAt: "created_at",
  },
}));

import { GET, POST, DELETE } from "./route";
import { auth } from "@/lib/auth";
import { checkApiKeyLimit } from "@/lib/tenant";
import { db } from "@scaffold-landing-pages/database/client";

function createRequest(
  method: string,
  body?: unknown,
  searchParams?: Record<string, string>
): Request {
  const url = new URL("http://localhost:3000/api/v1/api-keys");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new Request(url.toString(), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

const mockApiKeys = [
  {
    id: "key-1",
    name: "Production Key",
    keyPrefix: "sk_live",
    lastUsedAt: new Date(),
    expiresAt: null,
    createdAt: new Date(),
  },
  {
    id: "key-2",
    name: "Test Key",
    keyPrefix: "sk_live",
    lastUsedAt: null,
    expiresAt: new Date("2025-12-31"),
    createdAt: new Date(),
  },
];

describe("API Keys route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/api-keys - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });
  });

  describe("GET /api/v1/api-keys - Happy paths", () => {
    it("should return list of API keys for tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.apiKeys.findMany).mockResolvedValue(mockApiKeys);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe("Production Key");
      expect(data.data[1].name).toBe("Test Key");
    });

    it("should return empty array when no API keys exist", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.apiKeys.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
    });
  });

  describe("POST /api/v1/api-keys - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest("POST", { name: "New Key" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", { name: "New Key" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });

    it("should return 403 when user is member (not owner/manager)", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", { name: "New Key" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("POST /api/v1/api-keys - Validation", () => {
    it("should return 400 for missing name", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", {});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for name too short", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", { name: "A" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 for invalid expiresAt format", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("POST", {
        name: "New Key",
        expiresAt: "not-a-date",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });
  });

  describe("POST /api/v1/api-keys - Limit check", () => {
    it("should return 403 when API key limit reached", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(checkApiKeyLimit).mockResolvedValue({
        allowed: false,
        current: 5,
        limit: 5,
      });

      const request = createRequest("POST", { name: "New Key" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("API key limit reached");
      expect(data.code).toBe("UPGRADE_REQUIRED");
      expect(data.details.current).toBe(5);
      expect(data.details.limit).toBe(5);
    });
  });

  describe("POST /api/v1/api-keys - Happy paths", () => {
    it("should create API key for owner", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(checkApiKeyLimit).mockResolvedValue({
        allowed: true,
        current: 2,
        limit: 5,
      });

      const mockReturning = vi.fn().mockResolvedValue([
        {
          id: "new-key-id",
          name: "New Key",
          keyPrefix: "sk_live",
          createdAt: new Date(),
        },
      ]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", { name: "New Key" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.id).toBe("new-key-id");
      expect(data.data.name).toBe("New Key");
      expect(data.data.key).toMatch(/^sk_live_/);
    });

    it("should create API key for manager", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "manager",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(checkApiKeyLimit).mockResolvedValue({
        allowed: true,
        current: 0,
        limit: 5,
      });

      const mockReturning = vi.fn().mockResolvedValue([
        {
          id: "new-key-id",
          name: "Manager Key",
          keyPrefix: "sk_live",
          createdAt: new Date(),
        },
      ]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", { name: "Manager Key" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe("Manager Key");
    });

    it("should create API key with expiration date", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(checkApiKeyLimit).mockResolvedValue({
        allowed: true,
        current: 0,
        limit: 5,
      });

      const mockReturning = vi.fn().mockResolvedValue([
        {
          id: "new-key-id",
          name: "Expiring Key",
          keyPrefix: "sk_live",
          createdAt: new Date(),
        },
      ]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createRequest("POST", {
        name: "Expiring Key",
        expiresAt: "2025-12-31T23:59:59Z",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.name).toBe("Expiring Key");
      expect(mockValues).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/v1/api-keys - Authorization", () => {
    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = createRequest("DELETE", undefined, { keyId: "key-1" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 when no tenant", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", email: "test@example.com" },
        expires: new Date().toISOString(),
      });

      const request = createRequest("DELETE", undefined, { keyId: "key-1" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No tenant");
    });

    it("should return 403 when user is member (not owner/manager)", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("DELETE", undefined, { keyId: "key-1" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("DELETE /api/v1/api-keys - Validation", () => {
    it("should return 400 when keyId is missing", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });

      const request = createRequest("DELETE");
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Key ID required");
    });
  });

  describe("DELETE /api/v1/api-keys - Happy paths", () => {
    it("should delete API key for owner", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", undefined, { keyId: "key-1" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should delete API key for manager", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "manager",
        },
        expires: new Date().toISOString(),
      });

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", undefined, { keyId: "key-2" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("GET should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "member",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.apiKeys.findMany).mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

    it("POST should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(checkApiKeyLimit).mockRejectedValue(new Error("Database error"));

      const request = createRequest("POST", { name: "New Key" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

    it("DELETE should return 500 on internal error", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
          tenantRole: "owner",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.delete).mockImplementation(() => {
        throw new Error("Database error");
      });

      const request = createRequest("DELETE", undefined, { keyId: "key-1" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
