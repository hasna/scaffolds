import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { updateWebhook, deleteWebhook } from "@/lib/webhooks";

const updateWebhookSchema = z.object({
  name: z.string().min(2).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    if (session.user.tenantRole !== "owner" && session.user.tenantRole !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { webhookId } = await params;
    const body = await request.json();
    const parsed = updateWebhookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const webhook = await updateWebhook(webhookId, tenantId, parsed.data);

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json({ data: webhook });
  } catch (error) {
    console.error("Update webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    if (session.user.tenantRole !== "owner" && session.user.tenantRole !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { webhookId } = await params;
    await deleteWebhook(webhookId, tenantId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
