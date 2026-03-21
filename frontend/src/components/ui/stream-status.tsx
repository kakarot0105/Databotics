"use client";

import { Badge } from "./badge";

interface StreamStatusProps {
  status: "connecting" | "connected" | "disconnected" | "error";
  messagesPerSecond: number;
  lastMessageAt?: number | null;
}

export function StreamStatus({ status, messagesPerSecond, lastMessageAt }: StreamStatusProps) {
  const badgeVariant = status === "connected" ? "default" : status === "connecting" ? "secondary" : "outline";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant={badgeVariant}>{label}</Badge>
      <span className="text-xs text-slate-400">{messagesPerSecond.toFixed(1)} msg/s</span>
      <span className="text-xs text-slate-400">
        {lastMessageAt ? `Last message ${Math.round((Date.now() - lastMessageAt) / 1000)}s ago` : "No messages yet"}
      </span>
    </div>
  );
}
