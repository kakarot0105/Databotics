"use client";

import { useState } from "react";
import { validateFile, validateBySession } from "../../lib/api";
import { useAppStore } from "../../lib/store";
import { FileRequiredAlert } from "../../components/shared/file-required-alert";
import { Badge } from "../../components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import { toast } from "sonner";
import { ShieldCheck, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function ValidatePage() {
  const { uploadedFile, sessionId, validation, setValidation } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!uploadedFile && !sessionId) return <FileRequiredAlert />;

  const runValidation = async () => {
    setLoading(true);
    setError(null);
    try {
      let result;
      if (sessionId) {
        result = await validateBySession(sessionId);
      } else if (uploadedFile) {
        result = await validateFile(uploadedFile);
      } else {
        throw new Error("No dataset available");
      }
      setValidation(result);
      toast.success(`Validation complete: ${result.violations.length} violation(s)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Validation failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="glass-card flex flex-wrap items-center gap-4 rounded-xl p-5">
        <button
          onClick={runValidation}
          disabled={loading}
          className="gradient-btn flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {loading ? "Running…" : "Run Validation"}
        </button>
        {validation && !loading && (
          <div className="flex items-center gap-2">
            {validation.violations.length === 0 ? (
              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1">
                <CheckCircle2 className="h-3 w-3" /> All Clear
              </Badge>
            ) : (
              <Badge className="border-red-500/30 bg-red-500/10 text-red-400 gap-1">
                <XCircle className="h-3 w-3" /> {validation.violations.length} violations
              </Badge>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="animate-fade-in rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="glass-card animate-pulse rounded-xl p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-white/5" />
          ))}
        </div>
      )}

      {/* Success — no violations */}
      {validation && !loading && validation.violations.length === 0 && (
        <div className="animate-slide-up flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-2xl bg-emerald-500/10 p-6 mb-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">All validations passed!</h3>
          <p className="mt-1 text-sm text-muted-foreground">No rule violations detected in your dataset.</p>
        </div>
      )}

      {/* Violations table */}
      {validation && !loading && validation.violations.length > 0 && (
        <div className="animate-fade-in glass-card overflow-hidden rounded-xl">
          <div className="border-b border-white/[0.06] px-6 py-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Violations</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Column</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Row Sample</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validation.violations.map((violation, index) => (
                  <TableRow key={`${violation.column ?? "unknown"}-${index}`} className="border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                    <TableCell>
                      <Badge variant="outline" className="border-red-500/20 bg-red-500/5 text-red-400 text-[10px]">
                        {String(violation.column ?? "-")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{String(violation.message ?? "-")}</TableCell>
                    <TableCell className="max-w-md truncate font-mono text-xs text-muted-foreground/70">{JSON.stringify(violation.row_sample ?? "-")}</TableCell>
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
