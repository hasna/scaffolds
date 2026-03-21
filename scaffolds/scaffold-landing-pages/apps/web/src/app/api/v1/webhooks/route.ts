import { auth } from "@/lib/auth";
import { z } from "zod";
import { createWebhook } from "@/lib/webhooks";
import { db } from "@scaffold-landing-pages/database/client";
import * as schema from "@scaffold-landing-pages/database/schema";
import { eq, and, sql, desc, asc, like } from "drizzle-orm";
import {
  parsePaginationParams,
  buildPaginatedResponse,
  decodeCursor,
  parseFilterParams,
  parseSortParams,
  parseFieldParams,
  selectFieldsArray,
  createApiResponse,
  createApiErrorResponse,
  getRequestId,
} from "@/lib/api";
import { checkWebhookLimit } from "@/lib/tenant";

const createWebhookSchema = z.object({
  name: z.string().min(2),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  headers: z.record(z.string(), z.string()).optional(),
});

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createApiErrorResponse(
        { code: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401, requestId }
      );
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return createApiErrorResponse(
        { code: "NO_TENANT", message: "No tenant associated" },
        { status: 400, requestId }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse pagination
    const pagination = parsePaginationParams(searchParams);

    // Parse filters
    const filters = parseFilterParams(searchParams);

    // Parse sorting
    const sorts = parseSortParams(searchParams);

    // Parse field selection
    const fields = parseFieldParams(searchParams);

    // Build where conditions
    const conditions = [eq(schema.webhooks.tenantId, tenantId)];

    // Apply cursor pagination
    if (pagination.cursor) {
      const cursor = decodeCursor(pagination.cursor);
      if (cursor) {
        if (pagination.direction === "forward") {
          conditions.push(sql`${schema.webhooks.createdAt} < ${cursor.ts}`);
        } else {
          conditions.push(sql`${schema.webhooks.createdAt} > ${cursor.ts}`);
        }
      }
    }

    // Apply filters
    for (const filter of filters) {
      if (filter.field === "isActive" && filter.operator === "eq") {
        conditions.push(eq(schema.webhooks.isActive, filter.value === "true" || filter.value === true));
      }
      if (filter.field === "name" && filter.operator === "like") {
        conditions.push(like(schema.webhooks.name, `%${filter.value}%`));
      }
    }

    // Build order by
    const orderBy = [];
    for (const sort of sorts) {
      if (sort.field === "createdAt") {
        orderBy.push(sort.direction === "desc" ? desc(schema.webhooks.createdAt) : asc(schema.webhooks.createdAt));
      }
      if (sort.field === "name") {
        orderBy.push(sort.direction === "desc" ? desc(schema.webhooks.name) : asc(schema.webhooks.name));
      }
    }
    if (orderBy.length === 0) {
      orderBy.push(desc(schema.webhooks.createdAt));
    }

    // Fetch webhooks with pagination (+1 for hasNextPage check)
    const webhooks = await db.query.webhooks.findMany({
      where: and(...conditions),
      orderBy,
      limit: pagination.limit + 1,
    });

    // Build paginated response
    const paginatedWebhooks = buildPaginatedResponse(webhooks, pagination);

    // Hide secrets and apply field selection
    const safeWebhooks = paginatedWebhooks.data.map(({ secret, ...w }) => ({
      ...w,
      secret: `${secret.slice(0, 10)}...`,
    }));

    const selectedWebhooks = selectFieldsArray(safeWebhooks, fields);

    return createApiResponse(
      {
        data: selectedWebhooks,
        pagination: paginatedWebhooks.pagination,
      },
      { requestId }
    );
  } catch (error) {
    console.error("Get webhooks error:", error);
    return createApiErrorResponse(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500, requestId }
    );
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createApiErrorResponse(
        { code: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401, requestId }
      );
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return createApiErrorResponse(
        { code: "NO_TENANT", message: "No tenant associated" },
        { status: 400, requestId }
      );
    }

    if (session.user.tenantRole !== "owner" && session.user.tenantRole !== "manager") {
      return createApiErrorResponse(
        { code: "FORBIDDEN", message: "Insufficient permissions" },
        { status: 403, requestId }
      );
    }

    const body = await request.json();
    const parsed = createWebhookSchema.safeParse(body);

    if (!parsed.success) {
      return createApiErrorResponse(
        {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: parsed.error.flatten(),
        },
        { status: 400, requestId }
      );
    }

    // Check webhook limits
    const limitCheck = await checkWebhookLimit(tenantId);
    if (!limitCheck.allowed) {
      return createApiErrorResponse(
        {
          code: "UPGRADE_REQUIRED",
          message: "Webhook limit reached",
          details: {
            current: limitCheck.current,
            limit: limitCheck.limit,
          },
        },
        { status: 403, requestId }
      );
    }

    const webhook = await createWebhook(tenantId, parsed.data);

    return createApiResponse({ data: webhook }, { status: 201, requestId });
  } catch (error) {
    console.error("Create webhook error:", error);
    return createApiErrorResponse(
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500, requestId }
    );
  }
}
