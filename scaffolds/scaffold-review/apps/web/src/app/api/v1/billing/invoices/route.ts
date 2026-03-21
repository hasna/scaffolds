import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    const invoices = await db.query.invoices.findMany({
      where: eq(schema.invoices.tenantId, tenantId),
      orderBy: [desc(schema.invoices.createdAt)],
      limit: limit + 1, // Fetch one extra to check if there are more
      offset,
    });

    const hasMore = invoices.length > limit;
    const data = invoices.slice(0, limit).map((invoice) => ({
      id: invoice.id,
      stripeInvoiceId: invoice.stripeInvoiceId,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      invoiceUrl: invoice.hostedInvoiceUrl,
      invoicePdf: invoice.pdfUrl,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
    }));

    return NextResponse.json({
      data,
      pagination: {
        limit,
        offset,
        hasMore,
      },
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
