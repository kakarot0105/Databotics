"use client";

import { cn } from "@/lib/utils";

interface NLChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

export function NLChatMessage({ role, content, timestamp }: NLChatMessageProps) {
  const isUser = role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
          isUser
            ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-foreground"
            : "bg-white/5 text-muted-foreground",
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{content}</p>
        {timestamp ? (
          <p className="mt-2 text-[10px] text-muted-foreground/70">{timestamp}</p>
        ) : null}
      </div>
    </div>
  );
}
