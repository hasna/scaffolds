import { NextResponse } from "next/server";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth-utils";

export async function GET() {
  try {
    await requireRole("admin");

    const images = await db.query.cmsImages.findMany({
      orderBy: [desc(schema.cmsImages.createdAt)],
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Get images error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("admin");
    
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // For now, store a placeholder URL. In production, upload to S3/Cloudinary/etc.
    const url = "/uploads/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

    const [image] = await db
      .insert(schema.cmsImages)
      .values({
        url,
        alt: file.name,
        size: file.size,
        mimeType: file.type,
      })
      .returning();

    return NextResponse.json({ image }, { status: 201 });
  } catch (error) {
    console.error("Upload image error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json({ error: "imageId required" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(schema.cmsImages)
      .where(eq(schema.cmsImages.id, imageId))
      .returning({ id: schema.cmsImages.id });

    if (!deleted) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete image error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
