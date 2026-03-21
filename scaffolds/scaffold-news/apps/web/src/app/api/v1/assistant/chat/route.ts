import { NextRequest } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getApiContext } from "@/lib/api-context";
import {
  getAssistantConfig,
  addMessageToThread,
  trackUsage,
  estimateTokens,
} from "@/lib/ai";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq, and } from "drizzle-orm";
import { checkAssistantMessageLimit } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const authResult = await getApiContext(request);
    if (!authResult.success) {
      return new Response(authResult.error, { status: authResult.status });
    }

    const { userId, tenantId } = authResult.context;

    const body = await request.json();
    const { messages, threadId } = body;

    if (!threadId) {
      return new Response("Thread ID required", { status: 400 });
    }

    // Verify thread ownership and tenant isolation
    const thread = await db.query.assistantThreads.findFirst({
      where: and(
        eq(schema.assistantThreads.id, threadId),
        eq(schema.assistantThreads.tenantId, tenantId),
        eq(schema.assistantThreads.userId, userId)
      ),
    });

    if (!thread) {
      return new Response("Thread not found", { status: 404 });
    }

    // Check daily message limits
    const limitCheck = await checkAssistantMessageLimit(tenantId);
    if (!limitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "Daily message limit reached",
          code: "LIMIT_EXCEEDED",
          details: {
            current: limitCheck.current,
            limit: limitCheck.limit,
          },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const config = await getAssistantConfig(tenantId);

    // Get latest user message
    const userMessage = messages[messages.length - 1];
    if (userMessage?.role !== "user") {
      return new Response("Invalid message", { status: 400 });
    }

    // Save user message
    await addMessageToThread(threadId, "user", userMessage.content, estimateTokens(userMessage.content));

    // Build messages array with system prompt
    const systemMessages = config.systemPrompt
      ? [{ role: "system" as const, content: config.systemPrompt }]
      : [];

    const allMessages = [...systemMessages, ...messages];

    // Stream response
    const result = streamText({
      model: openai(config.model ?? "gpt-4o"),
      messages: allMessages,
      onFinish: async ({ text, usage }) => {
        // Save assistant message
        await addMessageToThread(
          threadId,
          "assistant",
          text,
          usage.outputTokens ?? 0
        );

        // Track usage
        await trackUsage(
          tenantId,
          userId,
          config.model ?? "gpt-4o",
          usage.inputTokens ?? 0,
          usage.outputTokens ?? 0
        );

        // Update thread title if first message
        const messageCount = await db.query.assistantMessages.findMany({
          where: eq(schema.assistantMessages.threadId, threadId),
        });

        if (messageCount.length <= 2) {
          const title = userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? "..." : "");
          await db
            .update(schema.assistantThreads)
            .set({ title, updatedAt: new Date() })
            .where(eq(schema.assistantThreads.id, threadId));
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return new Response("Internal error", { status: 500 });
  }
}
