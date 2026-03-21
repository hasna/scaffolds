import { Job } from "bullmq";
import OpenAI from "openai";
import { db } from "@scaffold-review/database/client";
import * as schema from "@scaffold-review/database/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface GenerateTitleData {
  type: "generate-title";
  threadId: string;
  firstMessage: string;
}

interface SummarizeThreadData {
  type: "summarize-thread";
  threadId: string;
}

interface TrackUsageData {
  type: "track-usage";
  tenantId: string;
  userId: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  model: string;
}

export type AIJobData = GenerateTitleData | SummarizeThreadData | TrackUsageData;

export async function processAIJob(job: Job<AIJobData>) {
  const { data } = job;

  logger.info("Processing AI job", { type: data.type });

  switch (data.type) {
    case "generate-title":
      return await generateThreadTitle(data.threadId, data.firstMessage);

    case "summarize-thread":
      return await summarizeThread(data.threadId);

    case "track-usage":
      return await trackUsage(
        data.tenantId,
        data.userId,
        data.inputTokens,
        data.outputTokens,
        data.costCents,
        data.model
      );
  }
}

async function generateThreadTitle(threadId: string, firstMessage: string) {
  if (!openai) {
    logger.warn("OpenAI not configured");
    return { skipped: true };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Generate a very short title (3-6 words) for a conversation that starts with this message. Return only the title, no quotes or punctuation.",
        },
        { role: "user", content: firstMessage.slice(0, 500) },
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    const title = response.choices[0]?.message?.content?.trim();

    if (title) {
      await db
        .update(schema.assistantThreads)
        .set({ title, updatedAt: new Date() })
        .where(eq(schema.assistantThreads.id, threadId));

      logger.info("Thread title generated", { threadId, title });
      return { title };
    }

    return { skipped: true };
  } catch (error) {
    logger.error("Failed to generate title", {
      threadId,
      error: String(error),
    });
    throw error;
  }
}

async function summarizeThread(threadId: string) {
  if (!openai) {
    logger.warn("OpenAI not configured");
    return { skipped: true };
  }

  const messages = await db.query.assistantMessages.findMany({
    where: eq(schema.assistantMessages.threadId, threadId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });

  if (messages.length < 10) {
    return { skipped: true, reason: "Not enough messages" };
  }

  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Summarize this conversation in 2-3 sentences, focusing on the main topics and outcomes.",
        },
        { role: "user", content: conversationText.slice(0, 10000) },
      ],
      max_tokens: 200,
    });

    const summary = response.choices[0]?.message?.content?.trim();

    if (summary) {
      await db
        .update(schema.assistantThreads)
        .set({
          metadata: { summary },
          updatedAt: new Date(),
        })
        .where(eq(schema.assistantThreads.id, threadId));

      logger.info("Thread summarized", { threadId });
      return { summary };
    }

    return { skipped: true };
  } catch (error) {
    logger.error("Failed to summarize thread", {
      threadId,
      error: String(error),
    });
    throw error;
  }
}

async function trackUsage(
  tenantId: string,
  userId: string,
  inputTokens: number,
  outputTokens: number,
  costCents: number,
  model: string
) {
  // Create usage record for this request
  await db.insert(schema.assistantUsage).values({
    tenantId,
    userId,
    model,
    inputTokens,
    outputTokens,
    costCents,
  });

  logger.info("Usage tracked", { tenantId, inputTokens, outputTokens, costCents });
  return { tracked: true };
}
