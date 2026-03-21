import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { eq, inArray } from "drizzle-orm";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { tenantId } = await params;

    // Verify tenant exists
    const tenant = await db.query.tenants.findFirst({
      where: eq(schema.tenants.id, tenantId),
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Delete tenant's related data in correct order (children before parents)

    // Get webhook IDs for this tenant, then delete their deliveries
    const webhooks = await db.query.webhooks.findMany({
      where: eq(schema.webhooks.tenantId, tenantId),
      columns: { id: true },
    });
    const webhookIds = webhooks.map(w => w.id);
    if (webhookIds.length > 0) {
      await db.delete(schema.webhookDeliveries).where(
        inArray(schema.webhookDeliveries.webhookId, webhookIds)
      );
    }
    await db.delete(schema.webhooks).where(eq(schema.webhooks.tenantId, tenantId));

    // Get thread IDs for this tenant, then delete their messages
    const threads = await db.query.assistantThreads.findMany({
      where: eq(schema.assistantThreads.tenantId, tenantId),
      columns: { id: true },
    });
    const threadIds = threads.map(t => t.id);
    if (threadIds.length > 0) {
      await db.delete(schema.assistantMessages).where(
        inArray(schema.assistantMessages.threadId, threadIds)
      );
    }
    await db.delete(schema.assistantThreads).where(eq(schema.assistantThreads.tenantId, tenantId));

    // Delete other tenant-scoped data
    await db.delete(schema.assistantUsage).where(eq(schema.assistantUsage.tenantId, tenantId));
    await db.delete(schema.assistantConfig).where(eq(schema.assistantConfig.tenantId, tenantId));
    await db.delete(schema.invoices).where(eq(schema.invoices.tenantId, tenantId));
    await db.delete(schema.subscriptions).where(eq(schema.subscriptions.tenantId, tenantId));
    await db.delete(schema.teamInvitations).where(eq(schema.teamInvitations.tenantId, tenantId));
    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.tenantId, tenantId));
    await db.delete(schema.apiKeys).where(eq(schema.apiKeys.tenantId, tenantId));
    await db.delete(schema.auditLogs).where(eq(schema.auditLogs.tenantId, tenantId));

    // Finally delete the tenant
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete tenant error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
