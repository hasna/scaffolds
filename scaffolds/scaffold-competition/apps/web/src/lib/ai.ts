import OpenAI from "openai";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq } from "drizzle-orm";
import { getEncoding, Tiktoken } from "js-tiktoken";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type AIProvider = "openai" | "anthropic";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Get AI configuration for a tenant
 */
export async function getAssistantConfig(tenantId: string) {
  const config = await db.query.assistantConfig.findFirst({
    where: eq(schema.assistantConfig.tenantId, tenantId),
  });

  return config ?? {
    systemPrompt: null,
    model: "gpt-4o",
    rateLimitPerUser: 100,
    rateLimitPerTenant: 1000,
  };
}

/**
 * Create a chat completion
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  } = {}
) {
  const {
    model = process.env.AI_DEFAULT_MODEL ?? "gpt-4o",
    maxTokens = 2048,
    temperature = 0.7,
    stream = false,
  } = options;

  const response = await openai.chat.completions.create({
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    max_tokens: maxTokens,
    temperature,
    stream,
  });

  return response;
}

/**
 * Create a streaming chat completion
 */
export async function createStreamingChatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
) {
  const {
    model = process.env.AI_DEFAULT_MODEL ?? "gpt-4o",
    maxTokens = 2048,
    temperature = 0.7,
  } = options;

  const stream = await openai.chat.completions.create({
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    max_tokens: maxTokens,
    temperature,
    stream: true,
  });

  return stream;
}

// Cache encodings to avoid re-initialization
let encodingCache: Map<string, Tiktoken> = new Map();

function getEncodingForModel(model: string): Tiktoken {
  // Map model names to encoding names
  const modelToEncoding: Record<string, string> = {
    "gpt-4o": "o200k_base",
    "gpt-4o-mini": "o200k_base",
    "gpt-4-turbo": "cl100k_base",
    "gpt-4": "cl100k_base",
    "gpt-3.5-turbo": "cl100k_base",
  };

  const encodingName = modelToEncoding[model] ?? "cl100k_base";

  if (!encodingCache.has(encodingName)) {
    encodingCache.set(encodingName, getEncoding(encodingName as any));
  }

  return encodingCache.get(encodingName)!;
}

/**
 * Count tokens using tiktoken (accurate)
 */
export function countTokens(text: string, model = "gpt-4o"): number {
  const encoding = getEncodingForModel(model);
  return encoding.encode(text).length;
}

/**
 * Estimate token count (rough approximation - fallback)
 */
export function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Count tokens for chat messages (includes message overhead)
 */
export function countMessagesTokens(messages: ChatMessage[], model = "gpt-4o"): number {
  const encoding = getEncodingForModel(model);
  let tokenCount = 0;

  for (const message of messages) {
    // Each message has overhead (~4 tokens for role, formatting)
    tokenCount += 4;
    tokenCount += encoding.encode(message.content).length;
  }

  // Add 2 tokens for assistant reply priming
  tokenCount += 2;

  return tokenCount;
}

/**
 * Calculate cost in cents
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  // Pricing per 1M tokens (approximate, update as needed)
  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-4o": { input: 2.5, output: 10 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4-turbo": { input: 10, output: 30 },
    "claude-3-opus": { input: 15, output: 75 },
    "claude-3-sonnet": { input: 3, output: 15 },
    "claude-3-haiku": { input: 0.25, output: 1.25 },
  };

  const modelPricing = pricing[model] ?? { input: 2.5, output: 10 };
  const inputCost = (inputTokens / 1_000_000) * modelPricing.input * 100;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output * 100;

  return Math.ceil(inputCost + outputCost);
}

/**
 * Track usage
 */
export async function trackUsage(
  tenantId: string,
  userId: string,
  model: string,
  inputTokens: number,
  outputTokens: number
) {
  const costCents = calculateCost(model, inputTokens, outputTokens);

  await db.insert(schema.assistantUsage).values({
    tenantId,
    userId,
    model,
    inputTokens,
    outputTokens,
    costCents,
  });

  return { inputTokens, outputTokens, costCents };
}

/**
 * Get thread messages
 */
export async function getThreadMessages(threadId: string) {
  return db.query.assistantMessages.findMany({
    where: eq(schema.assistantMessages.threadId, threadId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
}

/**
 * Create a thread
 */
export async function createThread(tenantId: string, userId: string, title?: string) {
  const config = await getAssistantConfig(tenantId);

  const [thread] = await db
    .insert(schema.assistantThreads)
    .values({
      tenantId,
      userId,
      title: title ?? "New conversation",
      model: config.model ?? "gpt-4o",
      systemPrompt: config.systemPrompt ?? undefined,
    })
    .returning();

  return thread;
}

/**
 * Add message to thread
 */
export async function addMessageToThread(
  threadId: string,
  role: "user" | "assistant" | "system",
  content: string,
  tokensUsed = 0,
  metadata: Record<string, unknown> = {}
) {
  const [message] = await db
    .insert(schema.assistantMessages)
    .values({
      threadId,
      role,
      content,
      tokensUsed,
      metadata,
    })
    .returning();

  return message;
}

/**
 * Get user threads
 */
export async function getUserThreads(userId: string, tenantId: string) {
  return db.query.assistantThreads.findMany({
    where: (t, { and, eq }) => and(eq(t.userId, userId), eq(t.tenantId, tenantId)),
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  });
}
