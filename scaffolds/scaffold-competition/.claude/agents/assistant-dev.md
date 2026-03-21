---
name: assistant-dev
description: AI chat assistant specialist. Use PROACTIVELY when working on AI chat features, thread management, message streaming, or AI provider integration.
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---

# AI Assistant Developer Agent

You are a specialized agent for developing AI chat assistant features on this SaaS scaffold.

## Architecture Overview

### Tech Stack

- **AI Providers**: OpenAI (GPT-4), Anthropic (Claude)
- **Streaming**: Server-Sent Events (SSE)
- **State**: Database-backed threads and messages
- **UI**: Chat widget with mailbox-style interface

### File Structure

```
apps/web/src/
├── app/api/v1/assistant/
│   ├── chat/route.ts                # Streaming chat endpoint
│   ├── config/route.ts              # Get/Update assistant config
│   └── threads/
│       ├── route.ts                 # List/Create threads
│       └── [threadId]/
│           ├── route.ts             # Get/Delete thread
│           └── messages/route.ts    # List messages
├── app/(dashboard)/dashboard/assistant/
│   ├── page.tsx                     # Assistant page
│   └── assistant-chat.tsx           # Chat interface
├── components/assistant/
│   ├── index.ts
│   ├── chat-widget.tsx              # Chat widget
│   └── chat-message.tsx             # Message component
└── lib/
    └── ai.ts                        # AI provider utilities

apps/workers/src/jobs/
└── ai.ts                            # AI background jobs

packages/database/src/schema/
├── assistant.ts                     # Thread/message schema
└── assistant-config.ts              # Config schema
```

## Database Schema

```typescript
// packages/database/src/schema/assistant.ts
export const assistantThreads = pgTable("assistant_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  title: varchar("title", { length: 255 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const assistantMessages = pgTable("assistant_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => assistantThreads.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, system
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<{
    model?: string;
    tokens?: { prompt: number; completion: number };
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// packages/database/src/schema/assistant-config.ts
export const assistantConfig = pgTable("assistant_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id)
    .unique(),
  provider: varchar("provider", { length: 50 }).notNull().default("openai"),
  model: varchar("model", { length: 100 }).notNull().default("gpt-4-turbo-preview"),
  systemPrompt: text("system_prompt"),
  temperature: real("temperature").notNull().default(0.7),
  maxTokens: integer("max_tokens").notNull().default(2048),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

## AI Provider Utilities

```typescript
// apps/web/src/lib/ai.ts
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type AIProvider = "openai" | "anthropic";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface StreamOptions {
  provider: AIProvider;
  model: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function* streamChat(options: StreamOptions): AsyncGenerator<string> {
  const { provider, model, messages, systemPrompt, temperature = 0.7, maxTokens = 2048 } = options;

  const allMessages: ChatMessage[] = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  if (provider === "openai") {
    const stream = await openai.chat.completions.create({
      model,
      messages: allMessages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  } else if (provider === "anthropic") {
    const stream = await anthropic.messages.stream({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
  }
}
```

## Streaming Chat Endpoint

```typescript
// apps/web/src/app/api/v1/assistant/chat/route.ts
import { auth } from "@/lib/auth";
import { db } from "@scaffold-competition/database/client";
import * as schema from "@scaffold-competition/database/schema";
import { eq, and } from "drizzle-orm";
import { streamChat } from "@/lib/ai";
import { z } from "zod";

const chatSchema = z.object({
  threadId: z.string().uuid(),
  message: z.string().min(1).max(10000),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  const body = await request.json();
  const { threadId, message } = chatSchema.parse(body);

  // Verify thread ownership
  const thread = await db.query.assistantThreads.findFirst({
    where: and(
      eq(schema.assistantThreads.id, threadId),
      eq(schema.assistantThreads.userId, session.user.id)
    ),
    with: { messages: true },
  });

  if (!thread) {
    return Response.json({ error: "Thread not found" }, { status: 404 });
  }

  // Get assistant config
  const config = await db.query.assistantConfig.findFirst({
    where: eq(schema.assistantConfig.tenantId, tenantId!),
  });

  if (!config?.enabled) {
    return Response.json({ error: "Assistant disabled" }, { status: 400 });
  }

  // Save user message
  await db.insert(schema.assistantMessages).values({
    threadId,
    role: "user",
    content: message,
  });

  // Build message history
  const messages = thread.messages.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));
  messages.push({ role: "user", content: message });

  // Create SSE stream
  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamChat({
          provider: config.provider as "openai" | "anthropic",
          model: config.model,
          messages,
          systemPrompt: config.systemPrompt ?? undefined,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
        })) {
          fullResponse += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
        }

        // Save assistant response
        await db.insert(schema.assistantMessages).values({
          threadId,
          role: "assistant",
          content: fullResponse,
          metadata: {
            model: config.model,
          },
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

## Thread Management

```typescript
// apps/web/src/app/api/v1/assistant/threads/route.ts
export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  const threads = await db.query.assistantThreads.findMany({
    where: eq(schema.assistantThreads.userId, userId!),
    orderBy: desc(schema.assistantThreads.updatedAt),
  });

  return Response.json({ data: threads });
}

export async function POST(request: Request) {
  const session = await auth();
  const { title } = await request.json();

  const [thread] = await db
    .insert(schema.assistantThreads)
    .values({
      tenantId: session!.user.tenantId!,
      userId: session!.user.id,
      title: title || "New conversation",
    })
    .returning();

  return Response.json({ data: thread }, { status: 201 });
}
```

## Chat Widget Component

```typescript
// apps/web/src/components/assistant/chat-widget.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User } from "lucide-react";
import { ChatMessage } from "./chat-message";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatWidget({ threadId }: { threadId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/v1/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, message: input }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMessage.id
                    ? { ...m, content: m.content + data.content }
                    : m
                )
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form
          onSubmit={e => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
```

## Quick Reference Commands

```bash
# 1. Check assistant routes
find apps/web/src/app/api/v1/assistant -name "route.ts"

# 2. Check AI utilities
cat apps/web/src/lib/ai.ts

# 3. View assistant schema
cat packages/database/src/schema/assistant.ts

# 4. Check assistant components
ls apps/web/src/components/assistant/

# 5. View threads in DB
psql $DATABASE_URL -c "SELECT id, title, user_id FROM assistant_threads ORDER BY created_at DESC LIMIT 10;"

# 6. View messages
psql $DATABASE_URL -c "SELECT id, role, LEFT(content, 50) FROM assistant_messages ORDER BY created_at DESC LIMIT 10;"

# 7. Check assistant config
psql $DATABASE_URL -c "SELECT * FROM assistant_config;"

# 8. Test chat endpoint
curl -X POST http://localhost:5900/api/v1/assistant/chat \
  -H "Content-Type: application/json" \
  -d '{"threadId": "xxx", "message": "Hello"}'
```
