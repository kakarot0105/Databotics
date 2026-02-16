"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { SidebarNav } from "./sidebar-nav";
import { Button } from "@/components/ui/button";

const PUBLIC_ROUTES = new Set(["/login", "/register"]);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!ready) {
    return null;
  }

  const showSidebar = !PUBLIC_ROUTES.has(pathname);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {showSidebar ? (
        <>
          <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-slate-950 px-4 py-3 text-slate-50 md:hidden">
            <span className="font-semibold">Databotics</span>
            <Button size="icon" variant="ghost" onClick={() => setMobileMenuOpen((prev) => !prev)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          <div className={`${mobileMenuOpen ? "block" : "hidden"} md:hidden`}>
            <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
          </div>

          <div className="hidden md:block">
            <SidebarNav />
          </div>
        </>
      ) : null}
      <main className="flex-1 bg-slate-50 p-4 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-50 md:p-8">
        {children}
      </main>
    </div>
  );
}
