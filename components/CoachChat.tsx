"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName } from "ai";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CoachMessageList } from "@/components/coach/CoachMessages";

const STARTER_PROMPTS = [
  "What career paths can I take from my current role?",
  "How do I negotiate a higher salary in Malaysia?",
  "What skills should I focus on in the next 6 months?",
  "How do I prepare for senior-level interviews?",
];

export function CoachChat({
  candidateName,
  seeking,
  currentRole,
  inPanel,
  onClose,
}: {
  candidateName: string;
  seeking: string;
  currentRole: string | null;
  inPanel?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigatedToolCallIds = useRef(new Set<string>());

  const { messages, sendMessage, status, error, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/coach" }),
  });

  const streaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          isToolUIPart(part) &&
          getToolName(part) === "navigateTo" &&
          part.state === "output-available" &&
          !navigatedToolCallIds.current.has(part.toolCallId)
        ) {
          navigatedToolCallIds.current.add(part.toolCallId);
          const path = (part.output as { path?: string } | undefined)?.path;
          if (path) {
            router.push(path);
            router.refresh();
          }
        }
      }
    }
  }, [messages, router]);

  function handleSend(content: string) {
    if (!content.trim() || streaming) return;
    sendMessage({ text: content });
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  return (
    <div className={cn("flex flex-col", inPanel ? "h-full" : "h-[100dvh]")}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-subtle flex items-center justify-center text-brand text-sm">
            ◉
          </div>
          <div>
            <h1 className="font-heading font-semibold text-sm">AI Career Coach</h1>
            <p className="text-xs text-muted-foreground">
              {seeking === "internship" ? "Internship guidance" : currentRole ? `Career advice for ${currentRole}` : "Career guidance"}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Close chat"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-xl leading-none shrink-0"
          >
            ×
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-12">
            <div className="text-4xl mb-4 text-brand">◉</div>
            <h2 className="font-heading text-lg font-semibold mb-2">
              Hey {candidateName.split(" ")[0]}, what&apos;s on your mind?
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-sm">
              I know your profile. Ask me anything about your career — paths, salary, skills, or next steps.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {STARTER_PROMPTS.map((prompt, i) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  style={{ "--i": i } as React.CSSProperties}
                  className="chat-rise text-left text-sm glass border border-border hover:border-brand/40 hover:bg-brand-subtle/20 px-4 py-3 rounded-lg transition-all text-muted-foreground hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <CoachMessageList messages={messages} streaming={streaming} variant="candidate" />
        {error && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-destructive text-center">Something went wrong.</p>
            <button
              type="button"
              onClick={() => regenerate()}
              className="text-xs font-medium text-brand hover:underline"
            >
              Retry
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border">
        <div className="flex gap-3 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your career..."
            rows={1}
            className="flex-1 resize-none"
            disabled={streaming}
          />
          <Button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || streaming}
            size="sm"
            className="mb-0.5 shrink-0"
          >
            {streaming ? "..." : "Send"}
          </Button>
        </div>
        <p className="hidden sm:block text-xs text-muted-foreground mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
