"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Settings2, Star, StarOff, Trash2 } from "lucide-react";
import { useNotifications } from "@/lib/notification-store";

function timeAgo(dateIso: string) {
  const date = new Date(dateIso);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markRead, toggleStar, remove } = useNotifications();

  const preview = useMemo(() => notifications.slice(0, 4), [notifications]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-muted-foreground transition hover:border-indigo-500/40 hover:text-foreground"
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
            </div>
            <Link
              href="/notifications/settings"
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <Settings2 className="h-4 w-4" />
            </Link>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {preview.map((item) => (
              <button
                key={item.id}
                onClick={() => markRead(item.id)}
                className={`flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition hover:bg-muted/40 ${item.read ? "opacity-70" : ""}`}
              >
                <div className={`mt-1 h-2 w-2 rounded-full ${item.read ? "bg-transparent" : "bg-indigo-500"}`} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{item.message}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(item.timestamp)}</p>
                </div>
                <div className="flex flex-col gap-2 text-muted-foreground">
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleStar(item.id);
                    }}
                    className="rounded p-1 hover:bg-muted/60"
                  >
                    {item.starred ? <Star className="h-3.5 w-3.5 text-amber-400" /> : <StarOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      remove(item.id);
                    }}
                    className="rounded p-1 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </button>
            ))}
            {preview.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">No notifications yet.</div>
            )}
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <Link
              href="/notifications"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
