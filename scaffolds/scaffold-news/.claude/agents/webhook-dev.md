---
name: webhook-dev
description: Webhook system specialist. Use PROACTIVELY when working on webhook endpoints, delivery, retries, HMAC signing, or event dispatching.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---

# Webhook Developer Agent

You are a specialized agent for developing the webhook system on this SaaS scaffold.

## Webhook Architecture

### File Structure

```
apps/web/src/
├── app/api/v1/webhooks/
│   ├── route.ts                     # List/Create webhooks
│   └── [webhookId]/route.ts         # Get/Update/Delete webhook
├── app/(dashboard)/dashboard/webhooks/
│   ├── page.tsx                     # Webhooks page
│   ├── webhooks-list.tsx            # Webhook list component
│   └── create-webhook-dialog.tsx    # Create dialog
├── lib/
│   ├── webhooks.ts                  # Webhook utilities
│   └── webhook-events.ts            # Event definitions
└── components/data-table/
    └── webhooks-data-table.tsx      # Webhook DataTable

apps/workers/src/jobs/
└── webhook.ts                       # Webhook delivery worker

packages/database/src/schema/
└── webhooks.ts                      # Webhook schema
```

## Database Schema

```typescript
// packages/database/src/schema/webhooks.ts
export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: text("events").array().notNull(),
  headers: jsonb("headers").$type<Record<string, string>>(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  webhookId: uuid("webhook_id")
    .notNull()
    .references(() => webhooks.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 20 }).notNull(), // pending, success, failed
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

## Webhook Events

```typescript
// apps/web/src/lib/webhook-events.ts
export const WEBHOOK_EVENTS = {
  // User events
  "user.created": "User was created",
  "user.updated": "User was updated",
  "user.deleted": "User was deleted",

  // Team events
  "team.member_added": "Team member was added",
  "team.member_removed": "Team member was removed",
  "team.member_role_changed": "Team member role was changed",

  // Billing events
  "subscription.created": "Subscription was created",
  "subscription.updated": "Subscription was updated",
  "subscription.cancelled": "Subscription was cancelled",
  "invoice.paid": "Invoice was paid",
  "invoice.failed": "Invoice payment failed",

  // API key events
  "api_key.created": "API key was created",
  "api_key.revoked": "API key was revoked",

  // Webhook events
  "webhook.created": "Webhook was created",
  "webhook.updated": "Webhook was updated",
  "webhook.deleted": "Webhook was deleted",
} as const;

export type WebhookEventType = keyof typeof WEBHOOK_EVENTS;
```

## Creating Webhooks

```typescript
// apps/web/src/lib/webhooks.ts
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import crypto from "crypto";

interface CreateWebhookInput {
  name: string;
  url: string;
  events: string[];
  headers?: Record<string, string>;
}

export async function createWebhook(tenantId: string, input: CreateWebhookInput) {
  const secret = `whsec_${crypto.randomBytes(32).toString("hex")}`;

  const [webhook] = await db
    .insert(schema.webhooks)
    .values({
      tenantId,
      name: input.name,
      url: input.url,
      secret,
      events: input.events,
      headers: input.headers,
    })
    .returning();

  return webhook;
}
```

## HMAC Signing

```typescript
// apps/web/src/lib/webhooks.ts
import crypto from "crypto";

export function signPayload(payload: string, secret: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  return `t=${timestamp},v1=${signature}`;
}

export function verifySignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance: number = 300 // 5 minutes
): boolean {
  const parts = signature.split(",");
  const timestamp = parseInt(parts.find((p) => p.startsWith("t="))?.slice(2) ?? "0");
  const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3);

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) {
    return false;
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  return v1 === expectedSignature;
}
```

## Dispatching Webhooks

```typescript
// apps/web/src/lib/webhooks.ts
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { eq, and, arrayContains } from "drizzle-orm";
import { webhookQueue } from "@scaffold-saas/workers";

export async function dispatchWebhookEvent(
  tenantId: string,
  event: string,
  payload: Record<string, unknown>
) {
  // Find all enabled webhooks subscribed to this event
  const webhooks = await db.query.webhooks.findMany({
    where: and(
      eq(schema.webhooks.tenantId, tenantId),
      eq(schema.webhooks.enabled, true),
      arrayContains(schema.webhooks.events, [event])
    ),
  });

  // Queue delivery for each webhook
  for (const webhook of webhooks) {
    const [delivery] = await db
      .insert(schema.webhookDeliveries)
      .values({
        webhookId: webhook.id,
        eventType: event,
        payload,
        status: "pending",
      })
      .returning();

    await webhookQueue.add("deliver", {
      deliveryId: delivery.id,
      webhookId: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      headers: webhook.headers,
      event,
      payload,
    });
  }
}
```

## Webhook Delivery Worker

```typescript
// apps/workers/src/jobs/webhook.ts
import { Worker, Queue } from "bullmq";
import { db } from "@scaffold-saas/database/client";
import * as schema from "@scaffold-saas/database/schema";
import { eq } from "drizzle-orm";
import { signPayload } from "@/lib/webhooks";
import { redis } from "../lib/redis";

const QUEUE_NAME = "webhook-delivery";

export const webhookQueue = new Queue(QUEUE_NAME, { connection: redis });

interface WebhookJob {
  deliveryId: string;
  webhookId: string;
  url: string;
  secret: string;
  headers?: Record<string, string>;
  event: string;
  payload: Record<string, unknown>;
}

export const webhookWorker = new Worker<WebhookJob>(
  QUEUE_NAME,
  async (job) => {
    const { deliveryId, url, secret, headers, event, payload } = job.data;

    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      id: deliveryId,
      event,
      data: payload,
      created_at: new Date().toISOString(),
    });

    const signature = signPayload(body, secret, timestamp);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": event,
          "X-Webhook-Delivery": deliveryId,
          ...headers,
        },
        body,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      const responseBody = await response.text().catch(() => "");

      await db
        .update(schema.webhookDeliveries)
        .set({
          status: response.ok ? "success" : "failed",
          attempts: job.attemptsMade + 1,
          lastAttemptAt: new Date(),
          responseStatus: response.status,
          responseBody: responseBody.slice(0, 1000),
        })
        .where(eq(schema.webhookDeliveries.id, deliveryId));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseBody}`);
      }
    } catch (error) {
      await db
        .update(schema.webhookDeliveries)
        .set({
          status: "failed",
          attempts: job.attemptsMade + 1,
          lastAttemptAt: new Date(),
          responseBody: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(schema.webhookDeliveries.id, deliveryId));

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 1000, // 100 per second
    },
  }
);

// Exponential backoff retry strategy
webhookWorker.on("failed", async (job, error) => {
  if (job && job.attemptsMade < 5) {
    // Retry with exponential backoff: 1m, 5m, 30m, 2h, 12h
    const delays = [60, 300, 1800, 7200, 43200];
    const delay = delays[job.attemptsMade - 1] ?? 43200;

    await webhookQueue.add("deliver", job.data, {
      delay: delay * 1000,
      attempts: 5 - job.attemptsMade,
    });
  }
});
```

## Webhook Payload Format

```json
{
  "id": "whd_abc123",
  "event": "user.created",
  "data": {
    "id": "usr_xyz789",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T12:00:00Z"
  },
  "created_at": "2024-01-15T12:00:00Z"
}
```

## Webhook Headers

```
Content-Type: application/json
X-Webhook-Signature: t=1705320000,v1=abc123...
X-Webhook-Event: user.created
X-Webhook-Delivery: whd_abc123
```

## Quick Reference Commands

```bash
# 1. List webhook routes
find apps/web/src/app/api -path "*webhook*" -name "route.ts"

# 2. Check webhook schema
cat packages/database/src/schema/webhooks.ts

# 3. Check webhook utilities
cat apps/web/src/lib/webhooks.ts

# 4. View webhook events
cat apps/web/src/lib/webhook-events.ts

# 5. Check webhook worker
cat apps/workers/src/jobs/webhook.ts

# 6. View webhooks in DB
psql $DATABASE_URL -c "SELECT id, name, url, events FROM webhooks;"

# 7. View recent deliveries
psql $DATABASE_URL -c "SELECT id, event_type, status, attempts FROM webhook_deliveries ORDER BY created_at DESC LIMIT 10;"

# 8. Test webhook endpoint
curl -X POST http://localhost:5900/api/v1/webhooks \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "url": "https://webhook.site/xxx", "events": ["user.created"]}'
```
