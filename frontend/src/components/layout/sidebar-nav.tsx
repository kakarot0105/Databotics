"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "../ui/badge";

const navItems = [
  { href: "/upload", label: "Upload" },
  { href: "/profile", label: "Profile" },
  { href: "/validate", label: "Validate" },
  { href: "/clean", label: "Clean" },
  { href: "/query", label: "Query" },
  { href: "/anomaly", label: "Anomaly Detection" },
  { href: "/ai-assist", label: "AI Assist" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-r bg-slate-950 text-slate-50 md:w-64">
      <div className="flex h-16 items-center justify-between border-b px-4">
        <h1 className="text-lg font-semibold">Databotics</h1>
        <Badge variant="secondary">Beta</Badge>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || (pathname === "/" && item.href === "/upload");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition ${
                active ? "bg-slate-800 font-medium text-white" : "text-slate-300 hover:bg-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
