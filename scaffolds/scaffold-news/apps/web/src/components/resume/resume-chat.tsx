"use client";

import { useState, useRef, useEffect } from "react";
import { IconSend, IconX, IconSparkles } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./chat-message";
import { ToolExecution } from "./tool-execution";
import { useResumeChat } from "@/hooks/use-resume-chat";
import { cn } from "@/lib/utils";

interface ResumeChatProps {
  resumeId: string;
  onResumeUpdated?: () => void;
  className?: string;
}

const SUGGESTIONS = [
  "Help me write a professional summary",
  "Add my work experience section",
  "Generate bullet points for my current role",
  "Tailor this resume for a software engineering position",
  "Scrape my LinkedIn profile to import data",
  "Improve my resume for ATS systems",
];

export function ResumeChat({ resumeId, onResumeUpdated, className }: ResumeChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isLoading,
    error,
    currentToolCalls,
    sendMessage,
    cancelRequest,
    clearMessages,
  } = useResumeChat({ resumeId, onResumeUpdated });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentToolCalls]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Chat Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <EmptyState onSuggestion={handleSuggestion} />
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id}>
                <ChatMessage message={message} />
                {message.toolCalls?.map((tool) => (
                  <div key={tool.id} className="mt-2 ml-8">
                    <ToolExecution
                      execution={{
                        id: tool.id,
                        name: tool.name,
                        status:
                          tool.status === "completed" || tool.status === "error"
                            ? tool.status
                            : "running",
                        input: {},
                        result:
                          tool.status === "completed" || tool.status === "error"
                            ? {
                                success: tool.success || false,
                                streamContent: tool.streamContent,
                                executionTime: tool.executionTime,
                              }
                            : undefined,
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}

            {/* Active tool calls */}
            {Array.from(currentToolCalls.values()).map((tool) => (
              <div key={tool.id} className="ml-8">
                <ToolExecution
                  execution={{
                    id: tool.id,
                    name: tool.name,
                    status:
                      tool.status === "completed" || tool.status === "error"
                        ? tool.status
                        : "running",
                    input: {},
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 text-destructive flex items-center justify-between px-4 py-2 text-sm">
          <span>{error}</span>
          <Button variant="ghost" size="icon" onClick={() => clearMessages()} className="h-6 w-6">
            <IconX className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to help with your resume..."
            className="max-h-[200px] min-h-[44px] resize-none"
            rows={1}
            disabled={isLoading}
          />
          {isLoading ? (
            <Button type="button" variant="outline" onClick={cancelRequest}>
              <IconX className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              <IconSend className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function EmptyState({ onSuggestion }: { onSuggestion: (s: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-8 text-center">
      <div className="bg-primary/10 mb-4 rounded-full p-4">
        <IconSparkles className="text-primary h-8 w-8" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">AI Resume Assistant</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        I can help you build, improve, and tailor your resume. Try one of these suggestions:
      </p>
      <div className="flex max-w-lg flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <Button
            key={suggestion}
            variant="outline"
            size="sm"
            onClick={() => onSuggestion(suggestion)}
            className="text-xs"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
