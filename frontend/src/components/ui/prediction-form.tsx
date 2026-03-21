"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "./input";
import { Button } from "./button";

export interface PredictionFormProps {
  features: string[];
  onPredict: (payload: Record<string, string>) => void | Promise<void>;
  loading?: boolean;
  result?: { prediction?: string | number; confidence?: number | null } | null;
}

export function PredictionForm({ features, onPredict, loading, result }: PredictionFormProps) {
  const initial = useMemo(() => Object.fromEntries(features.map((f) => [f, ""])), [features]);
  const [values, setValues] = useState<Record<string, string>>(initial);

  useEffect(() => {
    setValues(initial);
  }, [initial]);

  const handleChange = (feature: string, value: string) => {
    setValues((prev) => ({ ...prev, [feature]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onPredict(values);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        {features.map((feature) => (
          <div key={feature} className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{feature}</label>
            <Input
              value={values[feature]}
              onChange={(e) => handleChange(feature, e.target.value)}
              placeholder={feature}
            />
          </div>
        ))}
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" className="gradient-btn" disabled={loading}>
            {loading ? "Predicting…" : "Make Prediction"}
          </Button>
        </div>
      </form>

      {result && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
          <p className="text-muted-foreground">Prediction</p>
          <p className="text-xl font-semibold text-foreground">{String(result.prediction ?? "—")}</p>
          {result.confidence !== undefined && result.confidence !== null && (
            <p className="text-xs text-muted-foreground">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
          )}
        </div>
      )}
    </div>
  );
}
