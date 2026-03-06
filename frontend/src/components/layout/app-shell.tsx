"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, MessageSquare, X } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { SidebarNav } from "./sidebar-nav";
import { NotificationBell } from "./notification-bell";
import { ChatSidebar } from "./chat-sidebar";

const PUBLIC_ROUTES = new Set(["/login", "/register"]);

const PAGE_TITLES: Record<string, string> = {
  "/upload": "Upload Dataset",
  "/sessions": "Sessions",
  "/profile": "Data Profile",
  "/dashboard": "Dashboard Builder",
  "/validate": "Validation",
  "/clean": "Data Cleaning",
  "/data-cleaning": "AI Data Cleaning",
  "/query": "SQL Query",
  "/nl-query": "Ask AI",
  "/anomaly": "Anomaly Detection",
  "/insights": "AI Insights",
  "/connections": "Database Connections",
  "/notifications": "Notifications",
  "/notifications/settings": "Notification Settings",
  "/settings": "Settings",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const authed = isAuthenticated();
    const isPublic = PUBLIC_ROUTES.has(pathname) || pathname.startsWith("/share");

    if (!authed && !isPublic) {
      router.replace("/login");
      return;
    }

    if (authed && isPublic) {
      router.replace("/upload");
      return;
    }

    setReady(true);
  }, [pathname, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const showSidebar = !(PUBLIC_ROUTES.has(pathname) || pathname.startsWith("/share"));
  const pageTitle = PAGE_TITLES[pathname] || "";

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Gradient accent line at top */}
      <div className="fixed left-0 right-0 top-0 z-50 h-[2px] bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />

      {showSidebar ? (
        <>
          {/* Mobile header */}
          <div className="sticky top-[2px] z-40 flex items-center justify-between border-b border-white/[0.06] bg-[#0a0e1a]/95 px-4 py-3 backdrop-blur-xl md:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" aria-hidden="true">
                  <ellipse cx="12" cy="5" rx="8" ry="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" stroke="currentColor" strokeWidth="2" />
                  <path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <span className="font-semibold text-white">Databotics</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {/* Mobile sidebar overlay */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
              <div className="h-full w-64 animate-slide-in-left" onClick={(e) => e.stopPropagation()}>
                <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
              </div>
            </div>
          )}

          {/* Desktop sidebar */}
          <div className="hidden md:block md:sticky md:top-[2px] md:h-[calc(100vh-2px)]">
            <SidebarNav />
          </div>
        </>
      ) : null}

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden bg-background pt-[2px]">
        {showSidebar && pageTitle && (
          <div className="border-b border-border/50 bg-background/80 px-6 py-4 backdrop-blur-md md:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-xl font-bold text-foreground">{pageTitle}</h1>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <button
                  onClick={() => setChatOpen(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 text-xs font-semibold text-muted-foreground transition hover:border-indigo-500/40 hover:text-foreground"
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="page-enter p-4 md:p-8">
          {children}
        </div>
      </main>
      <ChatSidebar open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
