"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { queryFile, queryBySession } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Play, Loader2, Database, Terminal } from "lucide-react";

export default function QueryPage() {
  const { uploadedFile, sessionId } = useAppStore();
  const [sql, setSql] = useState("SELECT * FROM loaded_table LIMIT 100;");
  const [result, setResult] = useState<{ columns: string[]; rows: Record<string, unknown>[]; row_count: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasData = !!(sessionId || uploadedFile);

  const run = async () => {
    if (!hasData) return;
    setError(null);
    setLoading(true);
    try {
      let res;
      if (sessionId) {
        res = await queryBySession(sessionId, sql);
      } else if (uploadedFile) {
        res = await queryFile(uploadedFile, sql);
      } else {
        throw new Error("No dataset available");
      }
      setResult(res);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Query failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!hasData) {

    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-2xl bg-indigo-500/10 p-6 mb-4">
          <Database className="h-10 w-10 text-indigo-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No dataset loaded</h3>
        <p className="mt-1 text-sm text-muted-foreground">Upload a file first to run SQL queries.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Query Editor */}
      <div className="glass-card overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Terminal className="h-4 w-4" />
            <span className="font-medium">SQL Console</span>
            <Badge variant="outline" className="ml-2 border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[10px]">DuckDB</Badge>
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="gradient-btn flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {loading ? "Running…" : "Run"}
            <kbd className="ml-1 hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono sm:inline-block">⌘↵</kbd>
          </button>
        </div>
        <div className="p-1">
          <textarea
            rows={5}
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                run();
              }
            }}
            className="w-full resize-none rounded-lg bg-[#0d1117] p-4 font-mono text-sm text-emerald-300 placeholder:text-slate-600 focus:outline-none"
            placeholder="SELECT * FROM loaded_table LIMIT 100;"
          />
        </div>
      </div>

      {error && (
        <div className="animate-fade-in rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-4 text-sm font-mono text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="glass-card animate-pulse rounded-xl p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-white/5" />
          ))}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="animate-fade-in glass-card overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <h3 className="text-sm font-semibold text-foreground">Results</h3>
            <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400">{result.row_count} rows</Badge>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  {result.columns.map((c) => (
                    <TableHead key={c} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.slice(0, 200).map((row, i) => (
                  <TableRow key={i} className="border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                    {result.columns.map((c) => (
                      <TableCell key={c} className="text-muted-foreground">{String(row[c] ?? "")}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
