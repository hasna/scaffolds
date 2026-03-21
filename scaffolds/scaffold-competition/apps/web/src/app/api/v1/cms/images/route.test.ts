// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-utils
vi.mock("@/lib/auth-utils", () => ({
  requireRole: vi.fn(),
}));

// Mock database
vi.mock("@scaffold-competition/database/client", () => ({
  db: {
    query: {
      cmsImages: { findMany: vi.fn() },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}));

// Mock schema
vi.mock("@scaffold-competition/database/schema", () => ({
  cmsImages: {
    id: "id",
    createdAt: "created_at",
  },
}));

import { GET, POST, DELETE } from "./route";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@scaffold-competition/database/client";

function createDeleteRequest(imageId?: string): Request {
  const url = new URL("http://localhost:3000/api/v1/cms/images");
  if (imageId) {
    url.searchParams.set("imageId", imageId);
  }
  return new Request(url.toString(), { method: "DELETE" });
}

function createUploadRequest(file?: { name: string; type: string; size: number }): Request {
  const formData = new FormData();
  if (file) {
    const blob = new Blob(["test content"], { type: file.type });
    const testFile = new File([blob], file.name, { type: file.type });
    formData.append("file", testFile);
  }
  return new Request("http://localhost:3000/api/v1/cms/images", {
    method: "POST",
    body: formData,
  });
}

const mockImages = [
  {
    id: "image-1",
    url: "/uploads/123-test-image.png",
    alt: "test-image.png",
    size: 1024,
    mimeType: "image/png",
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "image-2",
    url: "/uploads/456-another-image.jpg",
    alt: "another-image.jpg",
    size: 2048,
    mimeType: "image/jpeg",
    createdAt: new Date("2024-01-01"),
  },
];

describe("CMS Images route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/cms/images - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsImages.findMany).mockResolvedValue(mockImages);

      await GET();

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("GET /api/v1/cms/images - Happy paths", () => {
    it("should return list of images", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsImages.findMany).mockResolvedValue(mockImages);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.images).toHaveLength(2);
      expect(data.images[0].url).toBe("/uploads/123-test-image.png");
    });

    it("should return empty array when no images", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsImages.findMany).mockResolvedValue([]);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.images).toHaveLength(0);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);
      vi.mocked(db.query.cmsImages.findMany).mockRejectedValue(
        new Error("Database error")
      );

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("POST /api/v1/cms/images - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const newImage = {
        id: "image-new",
        url: "/uploads/test-upload.png",
        alt: "test-upload.png",
        size: 512,
        mimeType: "image/png",
        createdAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newImage]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createUploadRequest({
        name: "test-upload.png",
        type: "image/png",
        size: 512,
      });
      await POST(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("POST /api/v1/cms/images - Validation", () => {
    it("should return 400 when no file provided", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = new Request("http://localhost:3000/api/v1/cms/images", {
        method: "POST",
        body: new FormData(),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("No file provided");
    });
  });

  describe("POST /api/v1/cms/images - Happy paths", () => {
    it("should upload image successfully", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const newImage = {
        id: "image-new",
        url: "/uploads/1234567890-test-image.png",
        alt: "test-image.png",
        size: 512,
        mimeType: "image/png",
        createdAt: new Date(),
      };

      const mockReturning = vi.fn().mockResolvedValue([newImage]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createUploadRequest({
        name: "test-image.png",
        type: "image/png",
        size: 512,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.image.id).toBe("image-new");
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockValues = vi.fn().mockImplementation(() => {
        throw new Error("Database error");
      });
      vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);

      const request = createUploadRequest({
        name: "test-image.png",
        type: "image/png",
        size: 512,
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });

  describe("DELETE /api/v1/cms/images - Authorization", () => {
    it("should require admin role", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "image-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createDeleteRequest("image-1");
      await DELETE(request);

      expect(requireRole).toHaveBeenCalledWith("admin");
    });
  });

  describe("DELETE /api/v1/cms/images - Validation", () => {
    it("should return 400 when imageId not provided", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const request = createDeleteRequest();
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("imageId required");
    });

    it("should return 404 when image not found", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createDeleteRequest("non-existent");
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Image not found");
    });
  });

  describe("DELETE /api/v1/cms/images - Happy paths", () => {
    it("should delete image successfully", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockReturning = vi.fn().mockResolvedValue([{ id: "image-1" }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createDeleteRequest("image-1");
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 500 on internal error", async () => {
      vi.mocked(requireRole).mockResolvedValue(undefined);

      const mockWhere = vi.fn().mockImplementation(() => {
        throw new Error("Database error");
      });
      vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);

      const request = createDeleteRequest("image-1");
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal error");
    });
  });
});
