/**
 * Provider abstraction — supports both OpenAI and Anthropic
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type Provider = "anthropic" | "openai";

export interface ProviderConfig {
  provider: Provider;
  model?: string;
  apiKey?: string;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CompletionResult {
  content: string;
  provider: Provider;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export async function createCompletion(
  messages: Message[],
  config: ProviderConfig
): Promise<CompletionResult> {
  if (config.provider === "openai") {
    const client = new OpenAI({ apiKey: config.apiKey ?? process.env.OPENAI_API_KEY });
    const model = config.model ?? "gpt-4o";
    const response = await client.chat.completions.create({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: config.maxTokens ?? 4096,
    });
    return {
      content: response.choices[0]?.message?.content ?? "",
      provider: "openai",
      model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    };
  } else {
    const client = new Anthropic({ apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY });
    const model = config.model ?? "claude-sonnet-4-6";
    const systemMsg = messages.find(m => m.role === "system");
    const userMessages = messages.filter(m => m.role !== "system");
    const response = await client.messages.create({
      model,
      max_tokens: config.maxTokens ?? 4096,
      system: systemMsg?.content,
      messages: userMessages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    });
    return {
      content: response.content[0]?.type === "text" ? response.content[0].text : "",
      provider: "anthropic",
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
