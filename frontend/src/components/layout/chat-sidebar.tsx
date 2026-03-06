"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Trash2, X } from "lucide-react";
import { useChat } from "@/lib/chat-store";

export function ChatSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { messages, sendMessage, clear } = useChat();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border/60 bg-background/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Databotics Chat</p>
            <p className="text-xs text-muted-foreground">Conversation history</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clear}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            aria-label="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow ${
                message.role === "user"
                  ? "bg-indigo-500 text-white"
                  : "bg-muted/60 text-foreground"
              }`}
            >
              <p>{message.content}</p>
              <p className={`mt-1 text-[10px] ${message.role === "user" ? "text-white/70" : "text-muted-foreground"}`}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(input);
          setInput("");
        }}
        className="border-t border-border/60 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about your data…"
            className="flex-1 rounded-lg border border-border bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-white transition hover:bg-indigo-400"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
