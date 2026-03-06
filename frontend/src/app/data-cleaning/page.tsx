"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, RotateCcw, RotateCw, Sparkles, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QualityScore } from "@/components/ui/quality-score";
import { IssueCard, Issue } from "@/components/ui/issue-card";
import { DataPreview, CellIssues } from "@/components/ui/data-preview";
import { getToken } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface AnalysisResponse {
  session_id: string;
  row_count: number;
  column_count: number;
  columns: Array<{ name: string; type: string; missing_count: number; missing_pct: number; stats?: Record<string, unknown> | null }>;
  issues: Issue[];
  summary: Record<string, number>;
  preview_rows: Record<string, unknown>[];
  preview_columns: string[];
  cell_issues: CellIssues;
  quality_score: number;
}

interface FixResponse {
  analysis: AnalysisResponse;
  undo_available: boolean;
  redo_available: boolean;
  csv: string;
}

function withAuthHeaders(init?: RequestInit): RequestInit {
  const token = getToken();
  const headers = new Headers(init?.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...init, headers };
}

export default function DataCleaningPage() {
  const [file, setFile] = useState<File | null>(null);
  const [textData, setTextData] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [redoAvailable, setRedoAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const columnHealth = useMemo(() => {
    if (!analysis) return {};
    const health: Record<string, "healthy" | "warning" | "critical"> = {};
    analysis.columns.forEach((col) => {
      if (col.missing_pct >= 15) health[col.name] = "critical";
      else if (col.missing_pct >= 5) health[col.name] = "warning";
      else health[col.name] = "healthy";
    });
    return health;
  }, [analysis]);

  const runAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      if (!file && textData.trim()) formData.append("text_data", textData.trim());
      const response = await fetch(`${API_BASE_URL}/api/cleaning/analyze`, withAuthHeaders({ method: "POST", body: formData }));
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as AnalysisResponse;
      setAnalysis(data);
      setCsvData(null);
      setUndoAvailable(false);
      setRedoAvailable(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const applyFix = async (issue: Issue | { fix_type: string }) => {
    if (!analysis) return;
    setActionLoading(true);
    setError(null);
    try {
      const payload = {
        session_id: analysis.session_id,
        ...("fix_type" in issue ? issue : issue.suggested_fix ?? {}),
      };
      const response = await fetch(`${API_BASE_URL}/api/cleaning/fix`, withAuthHeaders({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }));
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as FixResponse;
      setAnalysis(data.analysis);
      setCsvData(data.csv);
      setUndoAvailable(data.undo_available);
      setRedoAvailable(data.redo_available);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fix failed");
    } finally {
      setActionLoading(false);
    }
  };

  const autoFixAll = async () => {
    if (!analysis) return;
    setActionLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("session_id", analysis.session_id);
      const response = await fetch(`${API_BASE_URL}/api/cleaning/auto-fix`, withAuthHeaders({ method: "POST", body: form }));
      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as FixResponse;
      setAnalysis(data.analysis);
      setCsvData(data.csv);
      setUndoAvailable(data.undo_available);
      setRedoAvailable(data.redo_available);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auto-fix failed");
    } finally {
      setActionLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!csvData) return;
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cleaned-data.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <Card className="glass-card space-y-4 rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-500/15 p-2 text-indigo-400">
            <UploadCloud className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Upload CSV or Paste Data</p>
            <p className="text-xs text-muted-foreground">Analyze a dataset and surface quality issues instantly.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Textarea
            value={textData}
            onChange={(e) => setTextData(e.target.value)}
            placeholder="Paste CSV data here"
            rows={4}
          />
        </div>
        <Button className="w-full" onClick={runAnalyze} disabled={loading || (!file && !textData.trim())}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Analyze Data Quality
        </Button>
      </Card>

      {analysis && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <QualityScore score={analysis.quality_score} />
          <Card className="glass-card space-y-3 rounded-2xl border border-white/10 p-6">
            <p className="text-sm font-semibold text-foreground">Quick Actions</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={autoFixAll} disabled={actionLoading}>
                Auto-Fix All
              </Button>
              <Button variant="secondary" onClick={() => applyFix({ fix_type: "undo" })} disabled={!undoAvailable || actionLoading}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Undo
              </Button>
              <Button variant="secondary" onClick={() => applyFix({ fix_type: "redo" })} disabled={!redoAvailable || actionLoading}>
                <RotateCw className="mr-2 h-4 w-4" />
                Redo
              </Button>
              <Button variant="outline" onClick={downloadCsv} disabled={!csvData}>
                <Download className="mr-2 h-4 w-4" />
                Export Cleaned CSV
              </Button>
            </div>
          </Card>
        </div>
      )}

      {analysis && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Detected Issues</h2>
            {analysis.issues.length === 0 ? (
              <Card className="glass-card rounded-2xl border border-white/10 p-6 text-sm text-muted-foreground">
                No issues detected. Your dataset looks clean.
              </Card>
            ) : (
              analysis.issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onApply={applyFix}
                  disabled={actionLoading || !issue.suggested_fix || !("fix_type" in issue.suggested_fix)}
                />
              ))
            )}
          </div>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Data Preview</h2>
            <DataPreview
              columns={analysis.preview_columns}
              rows={analysis.preview_rows}
              cellIssues={analysis.cell_issues}
              columnHealth={columnHealth}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
