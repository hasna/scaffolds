// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  createPasswordResetToken: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-review/database/client", () => {
  return {
    db: {
      query: {
        users: {
          findFirst: vi.fn(),
        },
      },
    },
  };
});

// Mock schema
vi.mock("@scaffold-review/database/schema", () => ({
  users: { email: "email" },
}));

import { POST } from "./route";
import { createPasswordResetToken } from "@/lib/auth-utils";
import { db } from "@scaffold-review/database/client";

function createRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("Forgot password route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/forgot-password - Validation", () => {
    it("should return 400 for invalid email format", async () => {
      const request = createRequest({ email: "not-an-email" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("Invalid email");
    });

    it("should return 400 for missing email", async () => {
      const request = createRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("Invalid email");
    });

    it("should return 400 for empty email", async () => {
      const request = createRequest({ email: "" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.message).toBe("Invalid email");
    });
  });

  describe("POST /api/auth/forgot-password - Happy paths", () => {
    it("should return success message when user exists", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
      });
      vi.mocked(createPasswordResetToken).mockResolvedValue("reset-token-123");

      const request = createRequest({ email: "user@example.com" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("If an account exists, we sent a reset link");
      expect(createPasswordResetToken).toHaveBeenCalledWith("user-1");
    });

    it("should return same success message when user does not exist (prevent enumeration)", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

      const request = createRequest({ email: "nonexistent@example.com" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("If an account exists, we sent a reset link");
      expect(createPasswordResetToken).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/auth/forgot-password - Error handling", () => {
    it("should return 500 on internal error", async () => {
      vi.mocked(db.query.users.findFirst).mockRejectedValue(new Error("Database error"));

      const request = createRequest({ email: "user@example.com" });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).toBe("Something went wrong");
    });
  });
});
