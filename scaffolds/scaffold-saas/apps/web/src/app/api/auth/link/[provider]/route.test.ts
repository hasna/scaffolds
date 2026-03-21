// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  requireAuth: vi.fn(),
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  signIn: vi.fn(),
}));

import { GET } from "./route";
import { requireAuth } from "@/lib/auth-utils";
import { signIn } from "@/lib/auth";

function createRequest(provider: string, callbackUrl?: string): Request {
  const url = new URL(`http://localhost:3000/api/auth/link/${provider}`);
  if (callbackUrl) {
    url.searchParams.set("callbackUrl", callbackUrl);
  }
  return new Request(url.toString(), { method: "GET" });
}

describe("Link Provider route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/auth/link/[provider] - Authorization", () => {
    it("should return 500 when not authenticated (catches auth error)", async () => {
      const authError = new Error("Unauthorized");
      vi.mocked(requireAuth).mockRejectedValue(authError);

      const response = await GET(createRequest("google"), {
        params: Promise.resolve({ provider: "google" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
      expect(requireAuth).toHaveBeenCalled();
    });
  });

  describe("GET /api/auth/link/[provider] - Validation", () => {
    it("should return 400 for unsupported provider", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);

      const response = await GET(createRequest("facebook"), {
        params: Promise.resolve({ provider: "facebook" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Unsupported provider");
    });

    it("should return 400 for unsupported provider 'twitter'", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);

      const response = await GET(createRequest("twitter"), {
        params: Promise.resolve({ provider: "twitter" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Unsupported provider");
    });

    it("should return 400 for unsupported provider 'linkedin'", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);

      const response = await GET(createRequest("linkedin"), {
        params: Promise.resolve({ provider: "linkedin" }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Unsupported provider");
    });
  });

  describe("GET /api/auth/link/[provider] - Valid providers", () => {
    it("should initiate Google OAuth flow", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);

      // signIn throws a redirect
      const redirectError = new Error("Redirect");
      (redirectError as { digest?: string }).digest = "NEXT_REDIRECT:302";
      vi.mocked(signIn).mockRejectedValue(redirectError);

      await expect(
        GET(createRequest("google"), { params: Promise.resolve({ provider: "google" }) })
      ).rejects.toThrow();

      expect(signIn).toHaveBeenCalledWith("google", {
        redirectTo: "/dashboard/settings",
      });
    });

    it("should initiate GitHub OAuth flow", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);

      const redirectError = new Error("Redirect");
      (redirectError as { digest?: string }).digest = "NEXT_REDIRECT:302";
      vi.mocked(signIn).mockRejectedValue(redirectError);

      await expect(
        GET(createRequest("github"), { params: Promise.resolve({ provider: "github" }) })
      ).rejects.toThrow();

      expect(signIn).toHaveBeenCalledWith("github", {
        redirectTo: "/dashboard/settings",
      });
    });

    it("should use custom callbackUrl when provided", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);

      const redirectError = new Error("Redirect");
      (redirectError as { digest?: string }).digest = "NEXT_REDIRECT:302";
      vi.mocked(signIn).mockRejectedValue(redirectError);

      await expect(
        GET(createRequest("google", "/custom/callback"), {
          params: Promise.resolve({ provider: "google" }),
        })
      ).rejects.toThrow();

      expect(signIn).toHaveBeenCalledWith("google", {
        redirectTo: "/custom/callback",
      });
    });
  });

  describe("Error handling", () => {
    it("should return 500 on non-redirect internal error", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        user: { id: "user-1" },
      } as never);
      vi.mocked(signIn).mockRejectedValue(new Error("Database error"));

      const response = await GET(createRequest("google"), {
        params: Promise.resolve({ provider: "google" }),
      });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
