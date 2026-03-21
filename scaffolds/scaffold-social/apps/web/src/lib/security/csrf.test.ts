// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { isSameOrigin } from "./csrf";

describe("security/csrf", () => {
  describe("isSameOrigin", () => {
    function createMockRequest(headers: Record<string, string>): NextRequest {
      return new NextRequest(new URL("http://localhost/api/test"), {
        headers: new Headers(headers),
      });
    }

    it("should return true when no origin header", () => {
      const request = createMockRequest({ host: "localhost" });
      expect(isSameOrigin(request)).toBe(true);
    });

    it("should return true when no host header", () => {
      const request = createMockRequest({ origin: "http://localhost" });
      expect(isSameOrigin(request)).toBe(true);
    });

    it("should return true when origin matches host", () => {
      const request = createMockRequest({
        origin: "http://localhost",
        host: "localhost",
      });
      expect(isSameOrigin(request)).toBe(true);
    });

    it("should return true when origin with port matches host with port", () => {
      const request = createMockRequest({
        origin: "http://localhost:5900",
        host: "localhost:5900",
      });
      expect(isSameOrigin(request)).toBe(true);
    });

    it("should return false when origin does not match host", () => {
      const request = createMockRequest({
        origin: "http://evil.com",
        host: "localhost",
      });
      expect(isSameOrigin(request)).toBe(false);
    });

    it("should return false when origin port does not match host port", () => {
      const request = createMockRequest({
        origin: "http://localhost:5900",
        host: "localhost:4000",
      });
      expect(isSameOrigin(request)).toBe(false);
    });

    it("should return false for invalid origin URL", () => {
      const request = createMockRequest({
        origin: "not-a-valid-url",
        host: "localhost",
      });
      expect(isSameOrigin(request)).toBe(false);
    });

    it("should handle subdomain differences", () => {
      const request = createMockRequest({
        origin: "http://api.example.com",
        host: "www.example.com",
      });
      expect(isSameOrigin(request)).toBe(false);
    });
  });
});
