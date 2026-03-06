"use client";

import { useMemo, useState } from "react";
import { generateSql, type GenerateSqlResponse } from "../../lib/api";
import { useAppStore } from "../../lib/store";
import { FileRequiredAlert } from "../../components/shared/file-required-alert";
import { Bot, Sparkles, Loader2, Copy, Check, Code2, MessageSquare } from "lucide-react";

export default function AiAssistPage() {
  const { profile } = useAppStore();
  const [question, setQuestion] = useState("Show top 100 rows");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateSqlResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [model, setModel] = useState<"claude" | "kimi" | "codex">("claude");

  const schema = useMemo(() => {
    if (!profile) return {};
    return Object.fromEntries(profile.columns.map((c) => [c.name, c.type]));
  }, [profile]);

  if (!profile) return <FileRequiredAlert />;

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await generateSql({
        question,
        table: "loaded_table",
        schema,
        sample_rows: profile.sample_rows,
        model,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate SQL");
    } finally {
      setLoading(false);
    }
  };

  const copySQL = () => {
    if (result?.sql) {
      navigator.clipboard.writeText(result.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Input area */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-indigo-500/15 to-violet-500/15 p-2">
            <Bot className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Ask about your data</p>
            <p className="text-xs text-muted-foreground">Natural language → SQL (powered by AI)</p>
          </div>
        </div>

        <div className="relative">
          <MessageSquare className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground/50" />
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") run(); }}
            placeholder="Ask a question about your data…"
            className="w-full rounded-lg border border-border bg-background/50 py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Model</span>
          <div className="flex items-center gap-2">
            {[
              { label: "Claude", value: "claude" },
              { label: "Kimi", value: "kimi" },
              { label: "Codex", value: "codex" },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors ${
                  model === option.value
                    ? "border-indigo-500/60 bg-indigo-500/10 text-foreground"
                    : "border-border/60 bg-transparent"
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={option.value}
                  checked={model === option.value}
                  onChange={() => setModel(option.value as "claude" | "kimi" | "codex")}
                  className="h-3 w-3 accent-indigo-500"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={run}
          disabled={loading}
          className="gradient-btn flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "Generating…" : "Generate SQL"}
        </button>
      </div>

      {error && (
        <div className="animate-fade-in rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="animate-slide-up space-y-4">
          {/* SQL Block */}
          <div className="glass-card overflow-hidden rounded-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Code2 className="h-4 w-4" />
                <span className="font-medium">Generated SQL</span>
              </div>
              <button
                onClick={copySQL}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="p-4">
              <pre className="overflow-x-auto font-mono text-sm text-emerald-300">{result.sql}</pre>
            </div>
          </div>

          {/* Explanation */}
          {result.explanation && (
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-foreground">Explanation</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{result.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
