import { Queue } from "bullmq";
import { createRedisConnection } from "../lib/redis";

const connection = createRedisConnection();

export const emailQueue = new Queue("email", { connection });
export const webhookQueue = new Queue("webhook", { connection });
export const billingQueue = new Queue("billing", { connection });
export const aiQueue = new Queue("ai", { connection });
export const cleanupQueue = new Queue("cleanup", { connection });

export const queues = {
  email: emailQueue,
  webhook: webhookQueue,
  billing: billingQueue,
  ai: aiQueue,
  cleanup: cleanupQueue,
};

export type QueueName = keyof typeof queues;
