// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  requireAuth: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-news/database/client", () => ({
  db: {
    query: {
      accounts: { findMany: vi.fn() },
      users: { findFirst: vi.fn() },
    },
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-news/database/schema", () => ({
  accounts: {
    userId: "user_id",
    provider: "provider",
  },
  users: {
    id: "id",
  },
}));

import { GET, DELETE } from "./route";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@scaffold-news/database/client";

function createRequest(method: string, body?: unknown): Request {
  return new Request("http://localhost:3000/api/auth/linked-accounts", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : undefined,
  });
}

const mockAccounts = [
  {
    id: "account-1",
    provider: "google",
    providerAccountId: "google-123",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "account-2",
    provider: "github",
    providerAccountId: "github-456",
    createdAt: new Date("2024-01-15"),
  },
];

describe("Linked Accounts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/auth/linked-accounts - Authorization", () => {
    it("should return 500 when not authenticated", async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("GET /api/auth/linked-accounts - Happy paths", () => {
    it("should return list of linked accounts", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.accounts.findMany).mockResolvedValue(mockAccounts);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts).toHaveLength(2);
      expect(data.accounts[0].provider).toBe("google");
      expect(data.accounts[0].providerAccountId).toBe("google-123");
      expect(data.accounts[1].provider).toBe("github");
    });

    it("should return empty array when no accounts linked", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.accounts.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts).toHaveLength(0);
    });

    it("should map linkedAt from createdAt", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.accounts.findMany).mockResolvedValue([mockAccounts[0]]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts[0].linkedAt).toBeDefined();
    });
  });

  describe("DELETE /api/auth/linked-accounts - Authorization", () => {
    it("should return 500 when not authenticated", async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

      const request = createRequest("DELETE", { provider: "google" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("DELETE /api/auth/linked-accounts - Validation", () => {
    it("should return 400 when provider is missing", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);

      const request = createRequest("DELETE", {});
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });

    it("should return 400 when provider is empty", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);

      const request = createRequest("DELETE", { provider: "" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid input");
    });
  });

  describe("DELETE /api/auth/linked-accounts - Safety checks", () => {
    it("should return 400 when unlinking only login method without password", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        passwordHash: null, // No password
      });
      vi.mocked(db.query.accounts.findMany).mockResolvedValue([mockAccounts[0]]); // Only one account

      const request = createRequest("DELETE", { provider: "google" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot unlink your only login method. Add a password first.");
    });

    it("should allow unlinking when user has a password", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        passwordHash: "hashed_password", // Has password
      });
      vi.mocked(db.query.accounts.findMany).mockResolvedValue([mockAccounts[0]]);

      const mockWhere = vi.fn();
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", { provider: "google" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should allow unlinking when user has another linked account", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        passwordHash: null, // No password
      });
      vi.mocked(db.query.accounts.findMany).mockResolvedValue(mockAccounts); // Has two accounts

      const mockWhere = vi.fn();
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", { provider: "google" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("DELETE /api/auth/linked-accounts - Happy paths", () => {
    it("should successfully unlink account", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        passwordHash: "hashed_password",
      });
      vi.mocked(db.query.accounts.findMany).mockResolvedValue(mockAccounts);

      const mockWhere = vi.fn();
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createRequest("DELETE", { provider: "github" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("GET should return 500 on internal error", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.accounts.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });

    it("DELETE should return 500 on internal error", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(db.query.users.findFirst).mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("DELETE", { provider: "google" });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
