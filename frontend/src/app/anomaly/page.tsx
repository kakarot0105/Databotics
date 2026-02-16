"use client";

import { useMemo, useState } from "react";
import { analyzeFile, type AnalyzeResponse } from "../../lib/api";
import { useAppStore } from "../../lib/store";
import { FileRequiredAlert } from "../../components/shared/file-required-alert";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export default function AnomalyPage() {
  const { uploadedFile, profile } = useAppStore();
  const [timestampCol, setTimestampCol] = useState("");
  const [metricCol, setMetricCol] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const suggestedCols = useMemo(() => profile?.columns.map((c) => c.name).join(", ") ?? "", [profile]);

  if (!uploadedFile) return <FileRequiredAlert />;

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyzeFile(uploadedFile, {
        timestamp_col: timestampCol,
        metric_col: metricCol,
        method: "simple",
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anomaly detection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anomaly Detection</CardTitle>
        <CardDescription>Configure timestamp + metric columns and run z-score anomaly detection.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!!suggestedCols && <p className="text-xs text-slate-500">Columns: {suggestedCols}</p>}
        <div className="space-y-2">
          <Label htmlFor="timestamp-col">Timestamp column</Label>
          <Input id="timestamp-col" value={timestampCol} onChange={(e) => setTimestampCol(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="metric-col">Metric column</Label>
          <Input id="metric-col" value={metricCol} onChange={(e) => setMetricCol(e.target.value)} />
        </div>
        <Button onClick={run} disabled={loading || !timestampCol || !metricCol}>
          {loading ? "Running..." : "Run Detection"}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && <pre className="rounded border bg-white p-3 text-xs">{JSON.stringify(result, null, 2)}</pre>}
      </CardContent>
    </Card>
  );
}
