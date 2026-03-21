import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq, and, isNull } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { allResumeTools } from "@/lib/ai/tools/definitions";
import { executeToolCall } from "@/lib/ai/tools/registry";
import type { ToolContext, ExecutedTool } from "@/lib/ai/tools/types";
import type { ResumeContent } from "@scaffold-news/database/schema/resumes";

const anthropic = new Anthropic();

const chatSchema = z.object({
  message: z.string().min(1),
  threadId: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Convert our tool definitions to Anthropic format
function getAnthropicTools() {
  return allResumeTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: "object" as const,
      properties: Object.fromEntries(
        Object.entries(tool.inputSchema.shape).map(([key, value]) => {
          return [key, zodToJsonSchema(value)];
        })
      ),
      required: Object.entries(tool.inputSchema.shape)
        .filter(([, value]) => !isZodOptional(value))
        .map(([key]) => key),
    },
  }));
}

// Check if a Zod type is optional
function isZodOptional(zodType: unknown): boolean {
  if (!zodType || typeof zodType !== "object") return false;
  const typeDef = (zodType as { _def?: { typeName?: string } })._def;
  return typeDef?.typeName === "ZodOptional";
}

// Get the type name from a Zod type
function getZodTypeName(zodType: unknown): string | undefined {
  if (!zodType || typeof zodType !== "object") return undefined;
  return (zodType as { _def?: { typeName?: string } })._def?.typeName;
}

// Convert Zod schema to JSON Schema (simplified)
function zodToJsonSchema(zodType: unknown): object {
  const typeName = getZodTypeName(zodType);
  const def = (zodType as { _def?: Record<string, unknown> })._def;

  switch (typeName) {
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodArray":
      return {
        type: "array",
        items: zodToJsonSchema(def?.type),
      };
    case "ZodEnum":
      return {
        type: "string",
        enum: def?.values as string[],
      };
    case "ZodObject": {
      const shapeGetter = def?.shape as (() => Record<string, unknown>) | undefined;
      const shape = typeof shapeGetter === "function" ? shapeGetter() : {};
      return {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(shape).map(([key, value]) => [key, zodToJsonSchema(value)])
        ),
      };
    }
    case "ZodOptional":
      return zodToJsonSchema(def?.innerType);
    default:
      return { type: "string" };
  }
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const encoder = new TextEncoder();

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 400 });
    }

    const { id: resumeId } = await params;

    // Verify resume ownership
    const resume = await db.query.resumes.findFirst({
      where: and(
        eq(schema.resumes.id, resumeId),
        eq(schema.resumes.tenantId, tenantId),
        eq(schema.resumes.userId, session.user.id),
        isNull(schema.resumes.deletedAt)
      ),
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const body = await _request.json();
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { message, threadId, history = [] } = parsed.data;

    // Build context for the AI
    const content = resume.content as ResumeContent;
    const resumeContext = buildResumeContext(resume, content);

    const systemPrompt = `You are an expert AI resume assistant for 123Resume.co. You help users build, improve, and tailor their resumes through conversation.

Current Resume Context:
${resumeContext}

Available capabilities:
- Scrape profile data from URLs (LinkedIn, GitHub, portfolios)
- Create, update, and manage resumes
- Add, edit, and reorder resume sections
- Generate professional summaries and bullet points
- Improve existing content (grammar, action verbs, quantification)
- Analyze job postings and tailor resumes
- Export resumes in PDF, DOCX, or JSON formats

Guidelines:
1. Be conversational but professional
2. Use tools proactively when they would help the user
3. Explain what you're doing and why
4. Provide specific, actionable suggestions
5. Ask clarifying questions when needed
6. Always confirm major changes before making them

The current resume ID is: ${resumeId}`;

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const toolContext: ToolContext = {
          userId: session.user.id!,
          tenantId: tenantId!,
          resumeId,
          threadId,
        };

        // Build message history
        const messages: Anthropic.MessageParam[] = [
          ...history.map((h) => ({
            role: h.role as "user" | "assistant",
            content: h.content,
          })),
          { role: "user" as const, content: message },
        ];

        try {
          // Initial response with tool use
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4096,
            system: systemPrompt,
            tools: getAnthropicTools(),
            messages,
          });

          let currentResponse = response;
          const executedTools: ExecutedTool[] = [];

          // Process tool calls in a loop
          while (currentResponse.stop_reason === "tool_use") {
            const toolUseBlocks = currentResponse.content.filter(
              (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
            );

            const toolResults: Anthropic.ToolResultBlockParam[] = [];

            for (const toolUse of toolUseBlocks) {
              // Send tool execution start event
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "tool_start",
                    tool: toolUse.name,
                    toolId: toolUse.id,
                  })}\n\n`
                )
              );

              const startTime = Date.now();
              const result = await executeToolCall(toolUse.name, toolUse.input, toolContext);
              const executionTime = Date.now() - startTime;

              executedTools.push({
                id: toolUse.id,
                name: toolUse.name,
                input: toolUse.input,
                result,
                executionTime,
              });

              // Send tool execution result event
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "tool_result",
                    tool: toolUse.name,
                    toolId: toolUse.id,
                    success: result.success,
                    streamContent: result.streamContent,
                    executionTime,
                  })}\n\n`
                )
              );

              toolResults.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: result.success ? JSON.stringify(result.data) : `Error: ${result.error}`,
              });
            }

            // Continue conversation with tool results
            currentResponse = await anthropic.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 4096,
              system: systemPrompt,
              tools: getAnthropicTools(),
              messages: [
                ...messages,
                { role: "assistant", content: currentResponse.content },
                { role: "user", content: toolResults },
              ],
            });
          }

          // Extract and stream final text response
          const textBlocks = currentResponse.content.filter(
            (block): block is Anthropic.TextBlock => block.type === "text"
          );

          for (const block of textBlocks) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "text",
                  content: block.text,
                })}\n\n`
              )
            );
          }

          // Send done event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                executedTools: executedTools.map((t) => ({
                  id: t.id,
                  name: t.name,
                  success: t.result.success,
                  executionTime: t.executionTime,
                })),
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "An error occurred",
              })}\n\n`
            )
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
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function buildResumeContext(
  resume: typeof schema.resumes.$inferSelect,
  content: ResumeContent
): string {
  const parts: string[] = [];

  parts.push(`Title: ${resume.title}`);
  parts.push(`Template: ${resume.template}`);
  parts.push(`Is Master: ${resume.isMaster}`);

  if (resume.targetJobTitle) {
    parts.push(`Target Job: ${resume.targetJobTitle}`);
  }

  if (content.personalInfo) {
    const info = content.personalInfo;
    parts.push("\nContact Information:");
    if (info.fullName) parts.push(`  Name: ${info.fullName}`);
    if (info.email) parts.push(`  Email: ${info.email}`);
    if (info.phone) parts.push(`  Phone: ${info.phone}`);
    if (info.location) parts.push(`  Location: ${info.location}`);
  }

  if (content.summary) {
    parts.push(`\nSummary: ${content.summary}`);
  }

  if (content.sections?.length) {
    parts.push(`\nSections (${content.sections.length}):`);
    for (const section of content.sections) {
      const visibility = section.visible ? "" : " [hidden]";
      const itemCount = Array.isArray(section.content) ? section.content.length : 0;
      parts.push(`  - ${section.title} (${section.type})${visibility}: ${itemCount} items`);
    }
  }

  return parts.join("\n");
}
