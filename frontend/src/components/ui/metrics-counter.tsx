"use client";

interface MetricsCounterProps {
  label: string;
  value: string | number;
  helper?: string;
}

export function MetricsCounter({ label, value, helper }: MetricsCounterProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {helper && <p className="mt-1 text-xs text-slate-400">{helper}</p>}
    </div>
  );
}
