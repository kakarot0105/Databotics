"use client";

import { useMemo, useState } from "react";
import { analyzeFile, analyzeBySession, type AnalyzeResponse } from "../../lib/api";
import { useAppStore } from "../../lib/store";
import { FileRequiredAlert } from "../../components/shared/file-required-alert";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { AlertTriangle, Loader2, Search, ListChecks } from "lucide-react";

const TYPE_STYLES: Record<string, string> = {
  type_mismatch: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  outlier: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  null_spike: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
};

const TYPE_LABELS: Record<string, string> = {
  type_mismatch: "Type mismatch",
  outlier: "Outlier",
  null_spike: "Null spike",
};

type AnomalyRecord = {
  row_index?: number;
  column?: string;
  type?: string;
  value?: unknown;
  expected_type?: string;
  details?: Record<string, unknown>;
  row?: Record<string, unknown>;
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  if (typeof value === "boolean") return value ? "true" : "false";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export default function AnomalyPage() {
  const { uploadedFile, sessionId, profile } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [selected, setSelected] = useState<AnomalyRecord | null>(null);
  const [outlierMethod, setOutlierMethod] = useState<"iqr" | "zscore">("iqr");
  const [nullSpikeWindow, setNullSpikeWindow] = useState(3);

  const columns = useMemo(() => profile?.columns.map((c) => c.name) ?? [], [profile]);

  if (!uploadedFile && !sessionId) return <FileRequiredAlert />;

  const run = async () => {
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      const payload = {
        columns,
        outlier_method: outlierMethod,
        null_spike_window: nullSpikeWindow,
      };
      let response;
      if (sessionId) {
        response = await analyzeBySession(sessionId, payload);
      } else if (uploadedFile) {
        response = await analyzeFile(uploadedFile, payload);
      } else {
        throw new Error("No dataset available");
      }
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anomaly detection failed");
    } finally {
      setLoading(false);
    }
  };

  const anomalies = (result?.anomalies ?? []) as AnomalyRecord[];
  const counts = result?.summary?.by_type as Record<string, number> | undefined;

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="glass-card rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">Row-level Anomaly Scanner</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Detects type mismatches, statistical outliers, and null spikes across your rows. Click any anomaly for a detailed report and row snapshot.
        </p>
        {columns.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {columns.map((c) => (
              <Badge key={c} variant="outline" className="border-white/10 text-[10px]">
                {c}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outlier Method</p>
            <div className="flex items-center gap-2">
              {["iqr", "zscore"].map((method) => (
                <button
                  key={method}
                  onClick={() => setOutlierMethod(method as "iqr" | "zscore")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${outlierMethod === method ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30" : "bg-white/5 text-muted-foreground hover:text-foreground"}`}
                >
                  {method === "iqr" ? "IQR" : "Z-Score"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Null Spike Window</p>
            <input
              type="number"
              min={2}
              value={nullSpikeWindow}
              onChange={(e) => setNullSpikeWindow(Number(e.target.value) || 3)}
              className="w-24 rounded-lg border border-border bg-background/50 px-3 py-1.5 text-sm text-foreground"
            />
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="gradient-btn ml-auto flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Scanning…" : "Run Scan"}
          </button>
        </div>
      </div>

      {error && (
        <div className="animate-fade-in rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {["type_mismatch", "outlier", "null_spike"].map((type) => (
              <div key={type} className="glass-card rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{TYPE_LABELS[type]}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{counts?.[type] ?? 0}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="h-4 w-4 text-indigo-300" />
                <h4 className="text-sm font-semibold text-foreground">Flagged Rows</h4>
                <Badge className="ml-auto border-amber-500/30 bg-amber-500/10 text-amber-400">
                  {anomalies.length} anomalies
                </Badge>
              </div>

              {anomalies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No anomalies detected with the current settings.</p>
              ) : (
                <div className="max-h-[420px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Row</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Column</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {anomalies.map((a, i) => (
                        <TableRow
                          key={`${a.row_index}-${a.column}-${a.type}-${i}`}
                          onClick={() => setSelected(a)}
                          className={`cursor-pointer border-white/[0.04] transition-colors hover:bg-white/[0.04] ${selected === a ? "bg-white/[0.04]" : ""}`}
                        >
                          <TableCell className="text-muted-foreground">{a.row_index ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{a.column ?? "—"}</TableCell>
                          <TableCell>
                            <Badge className={TYPE_STYLES[a.type ?? ""] ?? "bg-white/5 text-muted-foreground"}>
                              {TYPE_LABELS[a.type ?? ""] ?? a.type ?? "Unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatValue(a.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="glass-card rounded-xl p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3">Anomaly Report</h4>
              {!selected ? (
                <p className="text-sm text-muted-foreground">Select an anomaly to view a detailed report and row snapshot.</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</p>
                      <Badge className={TYPE_STYLES[selected.type ?? ""] ?? "bg-white/5 text-muted-foreground"}>
                        {TYPE_LABELS[selected.type ?? ""] ?? selected.type}
                      </Badge>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-muted-foreground space-y-1">
                      <p><span className="text-foreground">Row:</span> {selected.row_index ?? "—"}</p>
                      <p><span className="text-foreground">Column:</span> {selected.column ?? "—"}</p>
                      <p><span className="text-foreground">Value:</span> {formatValue(selected.value)}</p>
                      {selected.expected_type && (
                        <p><span className="text-foreground">Expected:</span> {selected.expected_type}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</p>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <pre className="text-xs text-muted-foreground overflow-x-auto">{JSON.stringify(selected.details ?? {}, null, 2)}</pre>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Row Snapshot</p>
                    {selected.row ? (
                      <div className="max-h-56 overflow-y-auto rounded-lg border border-white/10">
                        <Table>
                          <TableBody>
                            {Object.entries(selected.row).map(([key, value]) => (
                              <TableRow key={key} className="border-white/[0.06]">
                                <TableCell className="text-xs font-semibold text-muted-foreground">{key}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{formatValue(value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No row snapshot available.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
