import { Worker } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { createRedisConnection } from "./lib/redis";
import { logger } from "./lib/logger";
import { processEmailJob, type EmailJobData } from "./jobs/email";
import { processWebhookJob } from "./jobs/webhook";
import { processBillingJob, type BillingJobData } from "./jobs/billing";
import { processAIJob, type AIJobData } from "./jobs/ai";
import { processCleanupJob, type CleanupJobData } from "./jobs/cleanup";
import { cleanupQueue } from "./queues";

const connection = createRedisConnection() as unknown as ConnectionOptions;

const workers: Worker[] = [];

// Email worker
workers.push(
  new Worker<EmailJobData>("email", processEmailJob, {
    connection,
    concurrency: 5,
  })
);

// Webhook worker
workers.push(
  new Worker("webhook", processWebhookJob, {
    connection,
    concurrency: 10,
    settings: {
      backoffStrategy: (attemptsMade) => {
        // Exponential backoff: 1min, 5min, 15min, 1hr, 2hr
        const delays = [60, 300, 900, 3600, 7200];
        return (delays[attemptsMade - 1] ?? 7200) * 1000;
      },
    },
  })
);

// Billing worker
workers.push(
  new Worker<BillingJobData>("billing", processBillingJob, {
    connection,
    concurrency: 3,
  })
);

// AI worker
workers.push(
  new Worker<AIJobData>("ai", processAIJob, {
    connection,
    concurrency: 5,
  })
);

// Cleanup worker
workers.push(
  new Worker<CleanupJobData>("cleanup", processCleanupJob, {
    connection,
    concurrency: 1,
  })
);

// Setup event handlers for all workers
workers.forEach((worker) => {
  worker.on("completed", (job) => {
    logger.debug(`Job ${job.id} completed on ${worker.name}`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`Job ${job?.id} failed on ${worker.name}`, {
      error: err.message,
    });
  });

  worker.on("error", (err) => {
    logger.error(`Worker ${worker.name} error`, { error: err.message });
  });
});

// Schedule recurring cleanup jobs
async function scheduleRecurringJobs() {
  // Cleanup expired tokens every hour
  await cleanupQueue.add(
    "expired-tokens",
    { type: "cleanup-expired-tokens" },
    {
      repeat: { pattern: "0 * * * *" }, // Every hour
      removeOnComplete: true,
    }
  );

  // Cleanup old webhook deliveries daily (keep 30 days)
  await cleanupQueue.add(
    "old-deliveries",
    { type: "cleanup-old-deliveries", retentionDays: 30 },
    {
      repeat: { pattern: "0 2 * * *" }, // Daily at 2 AM
      removeOnComplete: true,
    }
  );

  // Cleanup old audit logs weekly (keep 90 days)
  await cleanupQueue.add(
    "old-audit-logs",
    { type: "cleanup-old-audit-logs", retentionDays: 90 },
    {
      repeat: { pattern: "0 3 * * 0" }, // Weekly on Sunday at 3 AM
      removeOnComplete: true,
    }
  );

  // Cleanup unverified users weekly (older than 7 days)
  await cleanupQueue.add(
    "unverified-users",
    { type: "cleanup-unverified-users", olderThanDays: 7 },
    {
      repeat: { pattern: "0 4 * * 0" }, // Weekly on Sunday at 4 AM
      removeOnComplete: true,
    }
  );

  logger.info("Recurring jobs scheduled");
}

// Graceful shutdown
async function shutdown() {
  logger.info("Shutting down workers...");

  await Promise.all(workers.map((worker) => worker.close()));

  logger.info("All workers stopped");
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown();
});
process.on("SIGINT", () => {
  void shutdown();
});

// Start
async function main() {
  logger.info("Starting workers...", {
    workers: workers.map((w) => w.name),
  });

  await scheduleRecurringJobs();

  logger.info("Workers running. Press Ctrl+C to stop.");
}

main().catch((error: unknown) => {
  logger.error("Failed to start workers", { error: String(error) });
  process.exit(1);
});
