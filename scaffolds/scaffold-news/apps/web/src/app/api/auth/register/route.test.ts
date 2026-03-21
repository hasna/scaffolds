// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  hashPassword: vi.fn(),
  createEmailVerificationToken: vi.fn(),
  isAdminEmail: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-news/database/client", () => {
  return {
    db: {
      query: {
        users: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    },
  };
});

// Mock schema
vi.mock("@scaffold-news/database/schema", () => ({
  users: { email: "email" },
  tenants: { id: "id" },
  teamMembers: { tenantId: "tenant_id" },
}));

import { POST } from "./route";
import { hashPassword, createEmailVerificationToken, isAdminEmail } from "@/lib/auth-utils";
import { db } from "@scaffold-news/database/client";

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validUser = {
  name: "Test User",
  email: "test@example.com",
  password: "Password1!", // Valid: 8+ chars, upper, lower, digit, special
};

describe("Register route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hashPassword).mockResolvedValue("hashed-password");
    vi.mocked(createEmailVerificationToken).mockResolvedValue("verify-token-123");
    vi.mocked(isAdminEmail).mockReturnValue(false);
  });

  describe("POST /api/auth/register - Validation", () => {
    it("should return 400 for missing name", async () => {
      const request = createRequest({
        email: "test@example.com",
        password: "Password1!",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("Invalid input");
      expect(data.errors.name).toBeDefined();
    });

    it("should return 400 for invalid email", async () => {
      const request = createRequest({
        name: "Test User",
        email: "not-an-email",
        password: "Password1!",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("Invalid input");
      expect(data.errors.email).toBeDefined();
    });

    it("should return 400 for weak password (too short)", async () => {
      const request = createRequest({
        name: "Test User",
        email: "test@example.com",
        password: "Pass1!",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("Invalid input");
      expect(data.errors.password).toBeDefined();
    });

    it("should return 400 for password without uppercase", async () => {
      const request = createRequest({
        name: "Test User",
        email: "test@example.com",
        password: "password1!",
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for password without special character", async () => {
      const request = createRequest({
        name: "Test User",
        email: "test@example.com",
        password: "Password1",
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/auth/register - Existing user check", () => {
    it("should return 409 when email already exists", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "existing-user",
        email: "test@example.com",
      });

      const request = createRequest(validUser);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.message).toBe("An account with this email already exists");
    });
  });

  describe("POST /api/auth/register - Happy paths", () => {
    it("should create user successfully", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

      const mockInsert = vi.fn();
      const mockValues = vi.fn();
      const mockReturning = vi.fn();

      mockReturning
        .mockResolvedValueOnce([{ id: "new-user-id", email: "test@example.com" }])
        .mockResolvedValueOnce([{ id: "new-tenant-id", name: "Test User" }])
        .mockResolvedValueOnce([{ tenantId: "new-tenant-id", userId: "new-user-id" }]);

      mockValues.mockReturnValue({ returning: mockReturning });
      mockInsert.mockReturnValue({ values: mockValues });

      vi.mocked(db.insert).mockImplementation(mockInsert);

      const request = createRequest(validUser);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toContain("Account created successfully");
      expect(hashPassword).toHaveBeenCalledWith(validUser.password);
      expect(createEmailVerificationToken).toHaveBeenCalledWith(validUser.email);
    });

    it("should assign admin role for admin emails", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);
      vi.mocked(isAdminEmail).mockReturnValue(true);

      const mockInsert = vi.fn();
      const mockValues = vi.fn();
      const mockReturning = vi.fn();

      mockReturning
        .mockResolvedValueOnce([{ id: "admin-user-id", email: "admin@example.com" }])
        .mockResolvedValueOnce([{ id: "new-tenant-id" }])
        .mockResolvedValueOnce([{}]);

      mockValues.mockReturnValue({ returning: mockReturning });
      mockInsert.mockReturnValue({ values: mockValues });
      vi.mocked(db.insert).mockImplementation(mockInsert);

      const request = createRequest({
        ...validUser,
        email: "admin@example.com",
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(isAdminEmail).toHaveBeenCalledWith("admin@example.com");
    });
  });

  describe("POST /api/auth/register - Error handling", () => {
    it("should return 500 on database error", async () => {
      vi.mocked(db.query.users.findFirst).mockRejectedValue(new Error("Database error"));

      const request = createRequest(validUser);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe("Something went wrong");
    });

    it("should return 500 when user creation fails", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

      const mockInsert = vi.fn();
      const mockValues = vi.fn();
      const mockReturning = vi.fn().mockResolvedValueOnce([]);

      mockValues.mockReturnValue({ returning: mockReturning });
      mockInsert.mockReturnValue({ values: mockValues });
      vi.mocked(db.insert).mockImplementation(mockInsert);

      const request = createRequest(validUser);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe("Failed to create account");
    });
  });
});
