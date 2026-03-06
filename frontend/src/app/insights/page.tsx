"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { FileRequiredAlert } from "@/components/shared/file-required-alert";
import { insightsBySession, insightsFile, type InsightReport, type Insight } from "@/lib/api";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, TrendingUp, Lightbulb, Target, RefreshCw } from "lucide-react";

const typeMeta: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  trend: { label: "Trend", icon: TrendingUp, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  anomaly: { label: "Anomaly", icon: AlertTriangle, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  pattern: { label: "Pattern", icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  recommendation: { label: "Recommendation", icon: Lightbulb, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  opportunity: { label: "Opportunity", icon: Target, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Confidence</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const meta = typeMeta[insight.type] || typeMeta.pattern;
  const Icon = meta.icon;
  return (
    <div className="glass-card hover-lift rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium ${meta.color}`}>{meta.label}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{insight.type}</span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{insight.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
      </div>
      <ConfidenceBar value={insight.confidence ?? 0.5} />
      {insight.supporting_data && (
        <pre className="rounded-lg bg-white/5 p-3 text-[11px] text-muted-foreground overflow-x-auto">{JSON.stringify(insight.supporting_data, null, 2)}</pre>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const { uploadedFile, sessionId, profile } = useAppStore();
  const [useAi, setUseAi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<InsightReport | null>(null);

  if (!uploadedFile && !sessionId) return <FileRequiredAlert />;

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      let res: InsightReport;
      if (sessionId) res = await insightsBySession(sessionId, useAi);
      else if (uploadedFile) res = await insightsFile(uploadedFile, useAi);
      else throw new Error("No dataset available");
      setReport(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate insights");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/15 p-2.5">
            <Sparkles className="h-5 w-5 text-indigo-300" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">Insight Studio</h1>
            <p className="text-sm text-muted-foreground">Generate AI or heuristic insights, then share with stakeholders.</p>
          </div>
        </div>
        {profile && (
          <div className="text-xs text-muted-foreground">
            {profile.filename} · {profile.row_count.toLocaleString()} rows · {profile.columns.length} columns
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-indigo-500/15 to-violet-500/15 p-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Insight Controls</p>
            <p className="text-xs text-muted-foreground">Choose how to analyze your dataset and generate a report</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setUseAi(true)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border ${useAi ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" : "bg-white/5 text-white/50 border-white/10"}`}
          >
            Use AI (Claude)
          </button>
          <button
            onClick={() => setUseAi(false)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border ${!useAi ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" : "bg-white/5 text-white/50 border-white/10"}`}
          >
            Heuristic Only
          </button>
          <button
            onClick={run}
            disabled={loading}
            className="ml-auto gradient-btn flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          AI mode adds narrative recommendations. Heuristic mode runs fast checks for trends, anomalies, and patterns.
        </p>
      </div>

      {error && (
        <div className="animate-fade-in rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {!report && !loading && !error && (
        <div className="glass-card rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-8 text-center">
          <p className="text-sm font-semibold text-foreground">No insights generated yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Run the analysis to see trends, anomalies, and recommendations.</p>
        </div>
      )}

      {report && (
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Insight Report</p>
              <p className="text-xs text-muted-foreground">{report.total_rows.toLocaleString()} rows · {report.total_columns} columns · {report.ai_model}</p>
            </div>
            <div className="text-[10px] text-muted-foreground">{report.generated_at ? new Date(report.generated_at).toLocaleString() : ""}</div>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {report.insights.map((insight, idx) => (
              <InsightCard key={idx} insight={insight} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
