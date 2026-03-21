"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./chat-message";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface Thread {
  id: string;
}

export function AssistantSidebar() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bootstrapThread();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function bootstrapThread() {
    setIsBootstrapping(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/assistant/threads");
      if (!response.ok) {
        throw new Error("Failed to load assistant threads");
      }

      const data = await response.json();
      const threads = Array.isArray(data.data) ? (data.data as Thread[]) : [];
      const activeThread = threads[0] ?? (await createThread());

      setThreadId(activeThread.id);
      await loadMessages(activeThread.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load assistant.");
    } finally {
      setIsBootstrapping(false);
    }
  }

  async function createThread() {
    const response = await fetch("/api/v1/assistant/threads", {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to create assistant thread");
    }

    const data = await response.json();
    return data.data as Thread;
  }

  async function loadMessages(activeThreadId: string) {
    const response = await fetch(`/api/v1/assistant/threads/${activeThreadId}/messages`);
    if (!response.ok) {
      setMessages([]);
      return;
    }

    const data = await response.json();
    const loaded = Array.isArray(data.data) ? data.data : [];

    setMessages(
      loaded.map(
        (message: {
          id: string;
          role: "user" | "assistant";
          content: string;
          createdAt: string;
        }) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: new Date(message.createdAt),
        })
      )
    );
  }

  async function startNewThread() {
    setError(null);
    setIsBootstrapping(true);
    try {
      const newThread = await createThread();
      setThreadId(newThread.id);
      setMessages([]);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start a new chat.");
    } finally {
      setIsBootstrapping(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || !threadId || isLoading || isBootstrapping) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      createdAt: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    let assistantMessageId: string | null = null;

    try {
      const response = await fetch("/api/v1/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to get response";
        try {
          const errorBody = await response.json();
          if (errorBody?.error) {
            errorMessage = errorBody.error;
          }
        } catch {
          const text = await response.text();
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const newAssistantId = `assistant-${Date.now()}`;
      assistantMessageId = newAssistantId;
      setMessages((prev) => [
        ...prev,
        { id: newAssistantId, role: "assistant", content: "", createdAt: new Date() },
      ]);

      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        let handledData = false;

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          handledData = true;

          const data = line.replace(/^data:\s*/, "").trim();
          if (!data || data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta =
              (typeof parsed.text === "string" && parsed.text) ||
              (typeof parsed.content === "string" && parsed.content) ||
              (typeof parsed.delta?.content === "string" && parsed.delta.content) ||
              "";

            if (delta) {
              content += delta;
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMessageId ? { ...message, content } : message
                )
              );
            }
          } catch {
            // ignore parse errors
          }
        }

        if (!handledData && chunk) {
          content += chunk;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId ? { ...message, content } : message
            )
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Chat error";
      setError(message);

      if (assistantMessageId) {
        setMessages((prev) =>
          prev.map((item) =>
            item.id === assistantMessageId
              ? { ...item, content: "Sorry, I encountered an error. Please try again." }
              : item
          )
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            createdAt: new Date(),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-primary h-4 w-4" />
          <span className="text-sm font-semibold">AI Assistant</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={startNewThread}
          disabled={isBootstrapping || isLoading}
          className="h-8 w-8"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        {isBootstrapping ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="mt-2">Preparing assistant...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center text-center">
            <MessageSquare className="mb-3 h-10 w-10 opacity-50" />
            <p className="text-sm">Ask me anything about your workspace.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-3">
        {error && (
          <div className="bg-destructive/10 text-destructive mb-2 rounded-md px-3 py-2 text-xs">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={isLoading || isBootstrapping || !threadId}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isBootstrapping || !threadId}
            size="icon"
            className={cn(isLoading && "cursor-not-allowed")}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
