// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock database (even though not used in this route)
vi.mock("@scaffold-social/database/client", () => ({
  db: {},
}));

import { POST } from "./route";

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/contact", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validContact = {
  name: "Test User",
  email: "test@example.com",
  subject: "general",
  message: "This is a test message with at least 10 characters.",
};

describe("Contact route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/contact - Validation", () => {
    it("should return 400 for missing name", async () => {
      const request = createRequest({
        email: "test@example.com",
        subject: "general",
        message: "This is a test message with at least 10 characters.",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should return 400 for invalid email", async () => {
      const request = createRequest({
        name: "Test User",
        email: "not-an-email",
        subject: "general",
        message: "This is a test message with at least 10 characters.",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should return 400 for invalid subject", async () => {
      const request = createRequest({
        name: "Test User",
        email: "test@example.com",
        subject: "invalid-subject",
        message: "This is a test message with at least 10 characters.",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should return 400 for message too short", async () => {
      const request = createRequest({
        name: "Test User",
        email: "test@example.com",
        subject: "general",
        message: "Short",
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });
  });

  describe("POST /api/v1/contact - Valid subjects", () => {
    const validSubjects = ["general", "sales", "support", "billing", "partnership", "other"];

    for (const subject of validSubjects) {
      it(`should accept subject: ${subject}`, async () => {
        const request = createRequest({
          ...validContact,
          subject,
        });
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      });
    }
  });

  describe("POST /api/v1/contact - Happy paths", () => {
    it("should submit contact form successfully", async () => {
      const request = createRequest(validContact);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("message has been received");
    });
  });
});
