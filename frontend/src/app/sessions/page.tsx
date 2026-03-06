"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { listSessions, loadSession, deleteSession, exportSession, getShortcuts, type SessionMeta } from "@/lib/api";
import { toast } from "sonner";
import {
  Clock,
  Trash2,
  Download,
  Loader2,
  FileText,
  FolderOpen,
  HardDrive,
  Undo2,
  Redo2,
  Keyboard,
  Search,
  RefreshCw,
  ChevronRight,
  X,
} from "lucide-react";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatSize(kb: number) {
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function SessionsPage() {
  const { setSessionId, setProfile } = useAppStore();
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [shortcuts, setShortcuts] = useState<Record<string, string>>({});
  const [showShortcuts, setShowShortcuts] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listSessions();
      setSessions(res.sessions);
    } catch {
      // sessions endpoint may fail if no sessions exist yet
      setSessions([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");
    getShortcuts(isMac ? "mac" : "windows")
      .then((res) => setShortcuts(res.shortcuts))
      .catch(() => {});
  }, [load]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "o") {
        e.preventDefault();
        // focus search
        document.getElementById("session-search")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLoad = async (sessionId: string) => {
    try {
      const state = await loadSession(sessionId);
      setSessionId(state.session_id);
      toast.success(`Loaded session: ${state.filename}`);
    } catch (err) {
      toast.error("Failed to load session");
    }
  };

  const handleDelete = async (sessionId: string) => {
    setDeleting((p) => new Set(p).add(sessionId));
    try {
      await deleteSession(sessionId);
      setSessions((p) => p.filter((s) => s.session_id !== sessionId));
      toast.success("Session deleted");
    } catch {
      toast.error("Failed to delete");
    }
    setDeleting((p) => { const n = new Set(p); n.delete(sessionId); return n; });
  };

  const handleExport = async (sessionId: string, filename: string) => {
    try {
      const blob = await exportSession(sessionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}_session.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Session exported");
    } catch {
      toast.error("Export failed");
    }
  };

  const filtered = sessions.filter((s) =>
    !searchQuery || s.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/15 p-2.5">
            <FolderOpen className="h-5 w-5 text-indigo-300" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">Sessions</h1>
            <p className="text-sm text-muted-foreground">{sessions.length} saved session{sessions.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowShortcuts(!showShortcuts)} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-white/20 hover:text-foreground">
            <Keyboard className="h-4 w-4" /> Shortcuts
          </button>
          <button onClick={load} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-white/20 hover:text-foreground">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Shortcuts panel */}
      {showShortcuts && (
        <div className="glass-card rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Keyboard className="h-4 w-4 text-indigo-400" /> Keyboard Shortcuts</h3>
            <button onClick={() => setShowShortcuts(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(shortcuts).map(([action, key]) => (
              <div key={action} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                <span className="text-xs text-muted-foreground capitalize">{action}</span>
                <kbd className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-mono text-foreground">{key}</kbd>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <input
          id="session-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search sessions... (Ctrl+O)"
          className="w-full rounded-lg border border-border bg-background/50 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground/50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      <p className="text-xs text-muted-foreground">Search by filename, then click a row to load it.</p>

      {/* Sessions list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading sessions...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-10 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-sm font-semibold text-foreground">{sessions.length === 0 ? "No sessions yet" : "No matching sessions"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {sessions.length === 0 ? "Upload a file to create your first saved session." : "Try a different search term or clear the filter."}
          </p>
          {sessions.length === 0 && (
            <Link
              href="/upload"
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-indigo-500/15 px-4 py-2 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/25"
            >
              Upload Dataset
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((session) => (
            <div
              key={session.session_id}
              className="group glass-card hover-lift flex items-center gap-4 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-4 transition-all hover:border-indigo-500/20 hover:bg-indigo-500/[0.02] cursor-pointer"
              onClick={() => handleLoad(session.session_id)}
            >
              <div className="rounded-lg bg-indigo-500/10 p-2.5">
                <FileText className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground truncate">{session.filename}</h3>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-indigo-400 transition-colors" />
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(session.last_modified)}</span>
                  <span>{session.data_shape[0].toLocaleString()} × {session.data_shape[1]}</span>
                  <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> {formatSize(session.size_kb)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handleExport(session.session_id, session.filename); }}
                  className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground"
                  title="Export"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(session.session_id); }}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                  title="Delete"
                >
                  {deleting.has(session.session_id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Undo/Redo info */}
      <div className="glass-card rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Undo / Redo</h3>
        <p className="text-xs text-muted-foreground mb-3">All data cleaning and transformation operations support undo/redo. Use keyboard shortcuts or the toolbar buttons.</p>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <Undo2 className="h-4 w-4 text-indigo-400" />
            <div>
              <p className="text-xs font-medium text-foreground">Undo</p>
              <kbd className="text-[10px] text-muted-foreground font-mono">{shortcuts.undo || "Ctrl+Z"}</kbd>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <Redo2 className="h-4 w-4 text-indigo-400" />
            <div>
              <p className="text-xs font-medium text-foreground">Redo</p>
              <kbd className="text-[10px] text-muted-foreground font-mono">{shortcuts.redo || "Ctrl+Y"}</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
