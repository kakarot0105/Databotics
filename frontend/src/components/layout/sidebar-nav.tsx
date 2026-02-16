"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "../ui/badge";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/upload", label: "Upload" },
  { href: "/profile", label: "Profile" },
  { href: "/validate", label: "Validate" },
  { href: "/clean", label: "Clean" },
  { href: "/query", label: "Query" },
  { href: "/anomaly", label: "Anomaly Detection" },
  { href: "/ai-assist", label: "AI Assist" },
];

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="8" ry="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="h-full w-full border-r border-slate-800 bg-slate-950 text-slate-50 md:w-64">
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        <div className="flex items-center gap-2">
          <LogoMark />
          <h1 className="text-lg font-semibold">Databotics</h1>
        </div>
        <Badge variant="secondary">Beta</Badge>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || (pathname === "/" && item.href === "/upload");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`rounded-md px-3 py-2 text-sm transition ${
                active ? "bg-slate-800 font-medium text-white" : "text-slate-300 hover:bg-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 pt-0">
        <ThemeToggle />
      </div>
    </aside>
  );
}
