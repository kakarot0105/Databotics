"use client";

import { useState } from "react";
import { cleanFile, cleanBySession } from "../../lib/api";
import { useAppStore } from "../../lib/store";
import { FileRequiredAlert } from "../../components/shared/file-required-alert";
import { Sparkles, Download, Loader2, Scissors, Type, Copy } from "lucide-react";

export default function CleanPage() {
  const { uploadedFile, sessionId } = useAppStore();
  const [trimStrings, setTrimStrings] = useState(true);
  const [dropDuplicates, setDropDuplicates] = useState(false);
  const [normalizeCase, setNormalizeCase] = useState<"none" | "lower" | "upper">("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  if (!uploadedFile && !sessionId) return <FileRequiredAlert />;

  const runClean = async () => {
    setLoading(true);
    setError(null);
    setDownloaded(false);
    try {
      const opts = {
        trim_strings: trimStrings,
        drop_duplicates: dropDuplicates,
        normalize_case: normalizeCase === "none" ? undefined : normalizeCase,
      };
      let blob;
      if (sessionId) {
        blob = await cleanBySession(sessionId, opts);
      } else if (uploadedFile) {
        blob = await cleanFile(uploadedFile, opts);
      } else {
        throw new Error("No dataset available");
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "cleaned_output";
      link.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cleaning failed");
    } finally {
      setLoading(false);
    }
  };

  type ToggleOptionProps = {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    description: string;
    checked: boolean;
    onChange: (val: boolean) => void;
  };

  function ToggleOption({ icon: Icon, label, description, checked, onChange }: ToggleOptionProps) {
    return (
      <div
        onClick={() => onChange(!checked)}
        className={`glass-card cursor-pointer rounded-xl p-5 transition-all duration-200 ${checked ? "border-indigo-500/30 bg-indigo-500/5 ring-1 ring-indigo-500/20" : ""
          }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${checked ? "bg-indigo-500/15 text-indigo-400" : "bg-white/5 text-muted-foreground"}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          {/* Toggle switch */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
            className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${checked ? "bg-indigo-500" : "bg-white/10"
              }`}
          >
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"
              }`} />
          </button>
        </div>
      </div>
    );
  }

  const caseModes = [
    { value: "none" as const, label: "None" },
    { value: "lower" as const, label: "lowercase" },
    { value: "upper" as const, label: "UPPERCASE" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Options */}
      <div className="space-y-3">
        <ToggleOption
          icon={Scissors}
          label="Trim Strings"
          description="Remove leading and trailing whitespace from text values"
          checked={trimStrings}
          onChange={setTrimStrings}
        />
        <ToggleOption
          icon={Copy}
          label="Drop Duplicates"
          description="Remove duplicate rows from the dataset"
          checked={dropDuplicates}
          onChange={setDropDuplicates}
        />
      </div>

      {/* Case normalization */}
      <div className="glass-card rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/5 p-2 text-muted-foreground">
            <Type className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Normalize Case</p>
            <p className="text-xs text-muted-foreground">Transform text column casing</p>
          </div>
        </div>
        <div className="flex gap-2">
          {caseModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setNormalizeCase(mode.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${normalizeCase === mode.value
                ? "bg-indigo-500/15 text-indigo-400 ring-1 ring-indigo-500/30"
                : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={runClean}
        disabled={loading}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-all disabled:opacity-50 ${downloaded
          ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
          : "gradient-btn"
          }`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : downloaded ? (
          <>
            <Sparkles className="h-4 w-4" />
            Downloaded! Click to run again
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Run Clean & Download
          </>
        )}
      </button>

      {error && (
        <div className="animate-fade-in rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-4 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
