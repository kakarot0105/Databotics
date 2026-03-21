"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Upload,
  BarChart3,
  ShieldCheck,
  Sparkles,
  Database,
  AlertTriangle,
  Bell,
  LogOut,
  ChevronRight,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Cpu,
  Activity,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { ThemeToggle } from "./theme-toggle";
import { logout } from "@/lib/auth";
import type { ComponentType } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  group: "pipeline" | "intelligence";
}

const navItems: NavItem[] = [
  { href: "/ai-analyst", label: "AI Analyst", icon: Sparkles, group: "pipeline" },
  { href: "/upload", label: "Upload", icon: Upload, group: "pipeline" },
  { href: "/sessions", label: "Sessions", icon: FolderOpen, group: "pipeline" },
  { href: "/profile", label: "Profile", icon: BarChart3, group: "pipeline" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "pipeline" },
  { href: "/dashboards", label: "Dashboards", icon: LayoutDashboard, group: "pipeline" },
  { href: "/streaming", label: "Live Stream", icon: Activity, group: "pipeline" },
  { href: "/validate", label: "Validate", icon: ShieldCheck, group: "pipeline" },
  { href: "/clean", label: "Clean", icon: Sparkles, group: "pipeline" },
  { href: "/data-cleaning", label: "Data Cleaning", icon: Sparkles, group: "pipeline" },
  { href: "/query", label: "Query", icon: Database, group: "intelligence" },
  { href: "/nl-query", label: "Ask AI", icon: MessageSquare, group: "intelligence" },
  { href: "/auto-ml", label: "Auto-ML", icon: Cpu, group: "intelligence" },
  { href: "/anomaly", label: "Anomaly Detection", icon: AlertTriangle, group: "intelligence" },
  { href: "/insights", label: "AI Insights", icon: Sparkles, group: "intelligence" },
  { href: "/notifications", label: "Notifications", icon: Bell, group: "intelligence" },
  // AI Assist merged into query flow
];

function LogoMark() {
  return (
    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="8" ry="3" stroke="currentColor" strokeWidth="2" />
        <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5" stroke="currentColor" strokeWidth="2" />
        <path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" stroke="currentColor" strokeWidth="2" />
      </svg>
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  const pipelineItems = navItems.filter((i) => i.group === "pipeline");
  const intelItems = navItems.filter((i) => i.group === "intelligence");

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const renderItem = (item: NavItem) => {
    const active = pathname === item.href || (pathname === "/" && item.href === "/upload");
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${active
            ? "bg-gradient-to-r from-indigo-500/10 to-violet-500/10 text-indigo-400"
            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
          }`}
      >
        {/* Active indicator */}
        {active && (
          <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-indigo-400 to-violet-500" />
        )}
        <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"}`} />
        <span className="flex-1">{item.label}</span>
        {active && <ChevronRight className="h-3.5 w-3.5 text-indigo-400/60" />}
      </Link>
    );
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-white/[0.06] bg-[#0a0e1a]/95 backdrop-blur-xl md:w-64">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
        <LogoMark />
        <div className="flex flex-col">
          <h1 className="text-base font-bold tracking-tight text-white">Databotics</h1>
          <span className="text-[10px] font-medium uppercase tracking-widest text-indigo-400/70">Workbench</span>
        </div>
        <Badge className="ml-auto border-indigo-500/30 bg-indigo-500/10 text-[10px] text-indigo-400">Beta</Badge>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {/* Pipeline section */}
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Data Pipeline</p>
        {pipelineItems.map(renderItem)}

        {/* Intelligence section */}
        <div className="my-3 border-t border-white/[0.04]" />
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Intelligence</p>
        {intelItems.map(renderItem)}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-white/[0.06] p-3 space-y-2">
        <ThemeToggle />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
