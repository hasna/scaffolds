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
      invoices: { findMany: vi.fn() },
    },
  },
}));

// Mock schema
vi.mock("@scaffold-saas/database/schema", () => ({
  invoices: {
    tenantId: "tenant_id",
    createdAt: "created_at",
  },
}));

import { GET } from "./route";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-saas/database/client";

function createRequest(searchParams?: Record<string, string>): Request {
  const url = new URL("http://localhost:3000/api/v1/billing/invoices");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new Request(url.toString(), { method: "GET" });
}

const mockInvoices = [
  {
    id: "inv-1",
    tenantId: "tenant-1",
    stripeInvoiceId: "in_abc123",
    amount: 2999,
    currency: "usd",
    status: "paid",
    hostedInvoiceUrl: "https://invoice.stripe.com/abc",
    pdfUrl: "https://invoice.stripe.com/abc.pdf",
    paidAt: new Date("2024-01-15"),
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "inv-2",
    tenantId: "tenant-1",
    stripeInvoiceId: "in_def456",
    amount: 2999,
    currency: "usd",
    status: "paid",
    hostedInvoiceUrl: "https://invoice.stripe.com/def",
    pdfUrl: "https://invoice.stripe.com/def.pdf",
    paidAt: new Date("2024-02-15"),
    createdAt: new Date("2024-02-01"),
  },
];

describe("Billing Invoices route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/billing/invoices - Authorization", () => {
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

  describe("GET /api/v1/billing/invoices - Happy paths", () => {
    it("should return list of invoices", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.invoices.findMany).mockResolvedValue(mockInvoices);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe("inv-1");
      expect(data.data[0].stripeInvoiceId).toBe("in_abc123");
      expect(data.data[0].amount).toBe(2999);
      expect(data.data[0].status).toBe("paid");
    });

    it("should return empty array when no invoices", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.invoices.findMany).mockResolvedValue([]);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(0);
      expect(data.pagination.hasMore).toBe(false);
    });

    it("should include invoice URLs in response", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.invoices.findMany).mockResolvedValue([mockInvoices[0]]);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.data[0].invoiceUrl).toBe("https://invoice.stripe.com/abc");
      expect(data.data[0].invoicePdf).toBe("https://invoice.stripe.com/abc.pdf");
    });
  });

  describe("GET /api/v1/billing/invoices - Pagination", () => {
    it("should use default limit of 20", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.invoices.findMany).mockResolvedValue([]);

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination.limit).toBe(20);
      expect(data.pagination.offset).toBe(0);
    });

    it("should respect custom limit parameter", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.invoices.findMany).mockResolvedValue([]);

      const request = createRequest({ limit: "10" });
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination.limit).toBe(10);
    });

    it("should cap limit at 100", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.invoices.findMany).mockResolvedValue([]);

      const request = createRequest({ limit: "200" });
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination.limit).toBe(100);
    });

    it("should respect offset parameter", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.invoices.findMany).mockResolvedValue([]);

      const request = createRequest({ offset: "10" });
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination.offset).toBe(10);
    });

    it("should indicate hasMore when more results exist", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      // Return 3 items when limit is 2 (limit + 1 for hasMore check)
      vi.mocked(db.query.invoices.findMany).mockResolvedValue([
        mockInvoices[0],
        mockInvoices[1],
        { ...mockInvoices[0], id: "inv-3" },
      ]);

      const request = createRequest({ limit: "2" });
      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toHaveLength(2);
      expect(data.pagination.hasMore).toBe(true);
    });

    it("should indicate hasMore false when no more results", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: {
          id: "user-1",
          email: "test@example.com",
          tenantId: "tenant-1",
        },
        expires: new Date().toISOString(),
      });
      vi.mocked(db.query.invoices.findMany).mockResolvedValue(mockInvoices);

      const request = createRequest({ limit: "10" });
      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toHaveLength(2);
      expect(data.pagination.hasMore).toBe(false);
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
      vi.mocked(db.query.invoices.findMany).mockRejectedValue(
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
