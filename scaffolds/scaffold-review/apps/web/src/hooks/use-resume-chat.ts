"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallInfo[];
}

export interface ToolCallInfo {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "error";
  streamContent?: string;
  executionTime?: number;
  success?: boolean;
}

interface UseResumeChatOptions {
  resumeId: string;
  onResumeUpdated?: () => void;
}

interface StreamEvent {
  type: "tool_start" | "tool_result" | "text" | "done" | "error";
  tool?: string;
  toolId?: string;
  success?: boolean;
  streamContent?: string;
  executionTime?: number;
  content?: string;
  error?: string;
  executedTools?: Array<{
    id: string;
    name: string;
    success: boolean;
    executionTime: number;
  }>;
}

export function useResumeChat({ resumeId, onResumeUpdated }: UseResumeChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentToolCalls, setCurrentToolCalls] = useState<Map<string, ToolCallInfo>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setError(null);
      setIsLoading(true);

      // Add user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Prepare assistant message placeholder
      const assistantMessageId = crypto.randomUUID();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        toolCalls: [],
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`/api/v1/resumes/${resumeId}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: content,
            history: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        const toolCalls: ToolCallInfo[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            try {
              const event: StreamEvent = JSON.parse(line.slice(6));

              switch (event.type) {
                case "tool_start":
                  if (event.tool && event.toolId) {
                    const toolCall: ToolCallInfo = {
                      id: event.toolId,
                      name: event.tool,
                      status: "running",
                    };
                    toolCalls.push(toolCall);
                    setCurrentToolCalls((prev) => {
                      const next = new Map(prev);
                      next.set(event.toolId!, toolCall);
                      return next;
                    });

                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMessageId ? { ...m, toolCalls: [...toolCalls] } : m
                      )
                    );
                  }
                  break;

                case "tool_result":
                  if (event.toolId) {
                    const existingCall = toolCalls.find((t) => t.id === event.toolId);
                    if (existingCall) {
                      existingCall.status = event.success ? "completed" : "error";
                      existingCall.success = event.success;
                      existingCall.streamContent = event.streamContent;
                      existingCall.executionTime = event.executionTime;

                      setCurrentToolCalls((prev) => {
                        const next = new Map(prev);
                        next.set(event.toolId!, existingCall);
                        return next;
                      });

                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === assistantMessageId ? { ...m, toolCalls: [...toolCalls] } : m
                        )
                      );

                      // Notify resume was updated if tool succeeded
                      if (event.success && onResumeUpdated) {
                        onResumeUpdated();
                      }
                    }
                  }
                  break;

                case "text":
                  if (event.content) {
                    fullContent += event.content;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMessageId ? { ...m, content: fullContent } : m
                      )
                    );
                  }
                  break;

                case "done":
                  // Streaming complete
                  break;

                case "error":
                  throw new Error(event.error || "Stream error");
              }
            } catch (parseError) {
              console.error("Failed to parse stream event:", parseError);
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Request was cancelled
          return;
        }

        const errorMessage = err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);

        // Update assistant message with error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId ? { ...m, content: `Error: ${errorMessage}` } : m
          )
        );
      } finally {
        setIsLoading(false);
        setCurrentToolCalls(new Map());
        abortControllerRef.current = null;
      }
    },
    [resumeId, messages, isLoading, onResumeUpdated]
  );

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    currentToolCalls,
    sendMessage,
    cancelRequest,
    clearMessages,
  };
}
