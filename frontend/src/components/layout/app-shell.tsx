"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { SidebarNav } from "./sidebar-nav";

const PUBLIC_ROUTES = new Set(["/login", "/register"]);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const authed = isAuthenticated();
    const isPublic = PUBLIC_ROUTES.has(pathname);

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

  if (!ready) {
    return null;
  }

  const showSidebar = !PUBLIC_ROUTES.has(pathname);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {showSidebar ? <SidebarNav /> : null}
      <main className="flex-1 bg-slate-50 p-4 md:p-8">{children}</main>
    </div>
  );
}
