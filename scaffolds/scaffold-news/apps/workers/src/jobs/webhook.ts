import { Job } from "bullmq";
import crypto from "crypto";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

interface WebhookDeliveryData {
  deliveryId: string;
  webhookId: string;
  url: string;
  secret: string;
  headers?: Record<string, string>;
  payload: object;
}

const MAX_RETRIES = 5;
const RETRY_DELAYS = [60, 300, 900, 3600, 7200]; // seconds

function generateSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signaturePayload)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

function getRetryDelaySeconds(attemptNumber: number): number {
  return (
    RETRY_DELAYS[attemptNumber - 1] ??
    RETRY_DELAYS[RETRY_DELAYS.length - 1] ??
    60
  );
}

export async function processWebhookJob(job: Job<WebhookDeliveryData>) {
  const { data } = job;
  const attemptNumber = job.attemptsMade + 1;

  logger.info("Processing webhook delivery", {
    deliveryId: data.deliveryId,
    webhookId: data.webhookId,
    attempt: attemptNumber,
  });

  const payloadString = JSON.stringify(data.payload);
  const signature = generateSignature(payloadString, data.secret);

  const startTime = Date.now();

  try {
    const response = await fetch(data.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Id": data.webhookId,
        "X-Delivery-Id": data.deliveryId,
        ...data.headers,
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseTime = Date.now() - startTime;
    const responseBody = await response.text().catch(() => "");

    // Update delivery record
    await db
      .update(schema.webhookDeliveries)
      .set({
        status: response.ok ? "success" : "failed",
        responseStatusCode: response.status,
        responseBody: responseBody.slice(0, 10000),
        responseTime,
        attempts: attemptNumber,
        deliveredAt: response.ok ? new Date() : null,
        nextRetryAt:
          !response.ok && attemptNumber < MAX_RETRIES
            ? new Date(Date.now() + getRetryDelaySeconds(attemptNumber) * 1000)
            : null,
      })
      .where(eq(schema.webhookDeliveries.id, data.deliveryId));

    if (!response.ok) {
      logger.warn("Webhook delivery failed", {
        deliveryId: data.deliveryId,
        statusCode: response.status,
        attempt: attemptNumber,
      });

      if (attemptNumber < MAX_RETRIES) {
        throw new Error(`Webhook returned ${response.status}`);
      }
    }

    logger.info("Webhook delivered successfully", {
      deliveryId: data.deliveryId,
      statusCode: response.status,
      responseTime,
    });

    return { statusCode: response.status, responseTime };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    await db
      .update(schema.webhookDeliveries)
      .set({
        status: attemptNumber >= MAX_RETRIES ? "failed" : "pending",
        responseBody: String(error),
        responseTime,
        attempts: attemptNumber,
        nextRetryAt:
          attemptNumber < MAX_RETRIES
            ? new Date(Date.now() + getRetryDelaySeconds(attemptNumber) * 1000)
            : null,
      })
      .where(eq(schema.webhookDeliveries.id, data.deliveryId));

    logger.error("Webhook delivery error", {
      deliveryId: data.deliveryId,
      error: String(error),
      attempt: attemptNumber,
    });

    throw error;
  }
}
