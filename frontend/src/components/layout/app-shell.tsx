"use client";

import type { ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SidebarNav />
      <main className="flex-1 bg-slate-50 p-4 md:p-8">{children}</main>
    </div>
  );
}
