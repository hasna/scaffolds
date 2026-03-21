// @ts-nocheck
import { describe, it, expect, vi } from "vitest";
import { authConfig } from "./auth.config";

describe("auth.config", () => {
  describe("session configuration", () => {
    it("should use JWT strategy", () => {
      expect(authConfig.session?.strategy).toBe("jwt");
    });

    it("should have 24 hour max age", () => {
      expect(authConfig.session?.maxAge).toBe(24 * 60 * 60);
    });
  });

  describe("pages configuration", () => {
    it("should redirect to /login for signIn", () => {
      expect(authConfig.pages?.signIn).toBe("/login");
    });

    it("should redirect to /login for error", () => {
      expect(authConfig.pages?.error).toBe("/login");
    });

    it("should redirect to /onboarding for newUser", () => {
      expect(authConfig.pages?.newUser).toBe("/onboarding");
    });
  });

  describe("providers", () => {
    it("should include Google provider", () => {
      const providerNames = authConfig.providers?.map((p) => p.name || p.id);
      expect(providerNames).toContain("Google");
    });

    it("should include Credentials provider", () => {
      const providerNames = authConfig.providers?.map((p) => p.name || p.id);
      expect(providerNames).toContain("Credentials");
    });
  });

  describe("callbacks.authorized", () => {
    const authorizedCallback = authConfig.callbacks?.authorized;

    if (!authorizedCallback) {
      throw new Error("authorized callback not found");
    }

    function createMockParams(
      pathname: string,
      auth: boolean
    ): Parameters<typeof authorizedCallback>[0] {
      return {
        auth: auth
          ? ({ user: { id: "user-1", role: "user" } } as any)
          : null,
        request: {
          nextUrl: new URL(`http://localhost${pathname}`),
        } as any,
      };
    }

    it("should allow homepage without auth", () => {
      const result = authorizedCallback(createMockParams("/", false));
      expect(result).toBe(true);
    });

    it("should allow login page without auth", () => {
      const result = authorizedCallback(createMockParams("/login", false));
      expect(result).toBe(true);
    });

    it("should allow register page without auth", () => {
      const result = authorizedCallback(createMockParams("/register", false));
      expect(result).toBe(true);
    });

    it("should allow pricing page without auth", () => {
      const result = authorizedCallback(createMockParams("/pricing", false));
      expect(result).toBe(true);
    });

    it("should allow blog pages without auth", () => {
      const result = authorizedCallback(
        createMockParams("/blog/some-post", false)
      );
      expect(result).toBe(true);
    });

    it("should allow docs pages without auth", () => {
      const result = authorizedCallback(
        createMockParams("/docs/getting-started", false)
      );
      expect(result).toBe(true);
    });

    it("should allow API routes without auth", () => {
      const result = authorizedCallback(
        createMockParams("/api/health", false)
      );
      expect(result).toBe(true);
    });

    it("should require auth for dashboard", () => {
      const result = authorizedCallback(createMockParams("/dashboard", false));
      expect(result).toBe(false);
    });

    it("should allow dashboard with auth", () => {
      const result = authorizedCallback(createMockParams("/dashboard", true));
      expect(result).toBe(true);
    });

    it("should require auth for admin pages", () => {
      const result = authorizedCallback(createMockParams("/admin", false));
      expect(result).toBe(false);
    });

    it("should require auth for settings pages", () => {
      const result = authorizedCallback(
        createMockParams("/dashboard/settings", false)
      );
      expect(result).toBe(false);
    });

    it("should allow settings with auth", () => {
      const result = authorizedCallback(
        createMockParams("/dashboard/settings", true)
      );
      expect(result).toBe(true);
    });
  });

  describe("callbacks.jwt", () => {
    const jwtCallback = authConfig.callbacks?.jwt;

    if (!jwtCallback) {
      throw new Error("jwt callback not found");
    }

    it("should add user data to token when user is present", async () => {
      const result = await jwtCallback({
        token: {},
        user: { id: "user-123", role: "admin" } as any,
        account: null,
        trigger: "signIn",
      });

      expect(result.id).toBe("user-123");
      expect(result.role).toBe("admin");
    });

    it("should handle session update trigger", async () => {
      const result = await jwtCallback({
        token: { id: "user-123", role: "user" },
        user: null as any,
        account: null,
        trigger: "update",
        session: { tenantId: "tenant-456", tenantRole: "owner" },
      });

      expect(result.tenantId).toBe("tenant-456");
      expect(result.tenantRole).toBe("owner");
    });

    it("should preserve token data without user", async () => {
      const result = await jwtCallback({
        token: { id: "user-123", role: "user", custom: "value" },
        user: null as any,
        account: null,
        trigger: "signIn",
      });

      expect(result.id).toBe("user-123");
      expect(result.custom).toBe("value");
    });
  });

  describe("callbacks.session", () => {
    const sessionCallback = authConfig.callbacks?.session;

    if (!sessionCallback) {
      throw new Error("session callback not found");
    }

    it("should copy token data to session", async () => {
      const result = await sessionCallback({
        session: {
          user: { id: "", email: "test@example.com" },
          expires: new Date().toISOString(),
        } as any,
        token: {
          id: "user-123",
          role: "admin",
          tenantId: "tenant-456",
          tenantRole: "owner",
        },
      });

      expect(result.user.id).toBe("user-123");
      expect(result.user.role).toBe("admin");
      expect(result.user.tenantId).toBe("tenant-456");
      expect(result.user.tenantRole).toBe("owner");
    });
  });
});
