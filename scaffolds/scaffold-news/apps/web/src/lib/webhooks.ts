import crypto from "crypto";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq, and } from "drizzle-orm";

/**
 * Generate HMAC signature for webhook payload
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * Get webhooks for a tenant subscribed to an event
 */
export async function getWebhooksForEvent(tenantId: string, eventType: string) {
  const webhooks = await db.query.webhooks.findMany({
    where: and(
      eq(schema.webhooks.tenantId, tenantId),
      eq(schema.webhooks.isActive, true)
    ),
  });

  return webhooks.filter((webhook) => webhook.events.includes(eventType));
}

/**
 * Create a webhook delivery record
 */
export async function createWebhookDelivery(
  webhookId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  const [delivery] = await db
    .insert(schema.webhookDeliveries)
    .values({
      webhookId,
      eventType,
      payload,
      status: "pending",
      attempts: 0,
    })
    .returning();

  return delivery;
}

/**
 * Emit a webhook event
 */
export async function emitWebhookEvent(
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  const webhooks = await getWebhooksForEvent(tenantId, eventType);

  const deliveries = await Promise.all(
    webhooks.map((webhook) => createWebhookDelivery(webhook.id, eventType, payload))
  );

  // Queue deliveries for processing
  // In production, this would be handled by BullMQ
  for (const delivery of deliveries) {
    if (delivery) {
      // processWebhookDelivery(delivery.id);
    }
  }

  return deliveries;
}

/**
 * Get webhook events catalog
 */
export async function getWebhookEvents() {
  return db.query.webhookEvents.findMany({
    where: eq(schema.webhookEvents.isActive, true),
  });
}

/**
 * Get webhook delivery logs
 */
export async function getWebhookDeliveries(
  webhookId: string,
  limit = 50,
  offset = 0
) {
  return db.query.webhookDeliveries.findMany({
    where: eq(schema.webhookDeliveries.webhookId, webhookId),
    orderBy: (d, { desc }) => [desc(d.createdAt)],
    limit,
    offset,
  });
}

/**
 * Create a webhook
 */
export async function createWebhook(
  tenantId: string,
  data: {
    name: string;
    url: string;
    events: string[];
    headers?: Record<string, string>;
  }
) {
  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

  const [webhook] = await db
    .insert(schema.webhooks)
    .values({
      tenantId,
      name: data.name,
      url: data.url,
      events: data.events,
      secret,
      headers: data.headers ?? {},
      isActive: true,
    })
    .returning();

  return webhook;
}

/**
 * Update a webhook
 */
export async function updateWebhook(
  webhookId: string,
  tenantId: string,
  data: Partial<{
    name: string;
    url: string;
    events: string[];
    headers: Record<string, string>;
    isActive: boolean;
  }>
) {
  const [webhook] = await db
    .update(schema.webhooks)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(schema.webhooks.id, webhookId), eq(schema.webhooks.tenantId, tenantId)))
    .returning();

  return webhook;
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(webhookId: string, tenantId: string) {
  await db
    .delete(schema.webhooks)
    .where(and(eq(schema.webhooks.id, webhookId), eq(schema.webhooks.tenantId, tenantId)));
}

/**
 * Regenerate webhook secret
 */
export async function regenerateWebhookSecret(webhookId: string, tenantId: string) {
  const newSecret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

  const [webhook] = await db
    .update(schema.webhooks)
    .set({ secret: newSecret, updatedAt: new Date() })
    .where(and(eq(schema.webhooks.id, webhookId), eq(schema.webhooks.tenantId, tenantId)))
    .returning();

  return webhook;
}
