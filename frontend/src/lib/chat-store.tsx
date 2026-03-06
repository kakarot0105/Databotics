"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const STORAGE_KEY = "databotics_chat";

const defaultMessages: ChatMessage[] = [
  {
    id: "seed-1",
    role: "assistant",
    content: "Hi! Ask me anything about your datasets — I can help interpret profiles, validation issues, and outliers.",
    timestamp: new Date(Date.now() - 600000).toISOString(),
  },
];

interface ChatStore {
  messages: ChatMessage[];
  sendMessage: (content: string) => void;
  clear: () => void;
}

const ChatContext = createContext<ChatStore | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  const sendMessage = (content: string) => {
    if (!content.trim()) return;
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: "Got it. I can help summarize this once you upload data or open a profile.",
      timestamp: new Date().toISOString(),
    };

    setTimeout(() => {
      setMessages((prev) => [...prev, assistantMessage]);
    }, 500);
  };

  const value = useMemo<ChatStore>(
    () => ({
      messages,
      sendMessage,
      clear: () => setMessages(defaultMessages),
    }),
    [messages],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}
