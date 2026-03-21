"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ModelCard, type ModelSummary } from "@/components/ui/model-card";
import { FeatureImportanceChart, type FeatureImportanceEntry } from "@/components/ui/feature-importance-chart";
import { ConfusionMatrix } from "@/components/ui/confusion-matrix";
import { PredictionForm } from "@/components/ui/prediction-form";
import { Loader2, Sparkles } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface ModelDetail extends ModelSummary {
  feature_names: string[];
  target_col?: string;
  dataset_size?: number | null;
}

interface EvaluationResult {
  task_type: string;
  metrics: Record<string, number>;
  confusion_matrix?: { labels: string[]; matrix: number[][] };
  sample_predictions?: Array<{ actual: string | number; predicted: string | number }>;
}

export default function AutoMLPage() {
  const { uploadedFile, profile } = useAppStore();
  const [file, setFile] = useState<File | null>(uploadedFile ?? null);
  const [columns, setColumns] = useState<string[]>(profile?.columns?.map((c) => c.name) ?? []);
  const [targetColumn, setTargetColumn] = useState<string>("");
  const [modelName, setModelName] = useState<string>("");
  const [sqlQuery, setSqlQuery] = useState<string>("");
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modelDetail, setModelDetail] = useState<ModelDetail | null>(null);
  const [importance, setImportance] = useState<FeatureImportanceEntry[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState<{ prediction?: string | number; confidence?: number | null } | null>(null);

  useEffect(() => {
    if (profile?.columns?.length) {
      setColumns(profile.columns.map((c) => c.name));
    }
  }, [profile]);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auto-ml/models`);
      const data = await res.json();
      setModels(data.models ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (next: File | null) => {
    setFile(next);
    setSqlQuery("");
    if (!next) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const header = text.split(/\r?\n/)[0];
      const parsed = header.split(",").map((c) => c.trim()).filter(Boolean);
      if (parsed.length) {
        setColumns(parsed);
      }
    };
    reader.readAsText(next);
  };

  const startProgress = () => {
    setProgress(10);
    const steps = [25, 45, 65, 80, 90];
    let index = 0;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (index >= steps.length) return prev;
        const nextValue = steps[index];
        index += 1;
        return nextValue;
      });
    }, 600);
    return timer;
  };

  const trainModel = async () => {
    setTraining(true);
    setError(null);
    setEvaluation(null);
    setPredictionResult(null);

    const timer = startProgress();

    try {
      const form = new FormData();
      if (file) form.append("file", file);
      if (!file && sqlQuery.trim()) form.append("sql_query", sqlQuery.trim());
      if (targetColumn) form.append("target_col", targetColumn);
      if (modelName.trim()) form.append("name", modelName.trim());

      const res = await fetch(`${API_BASE_URL}/api/auto-ml/train`, { method: "POST", body: form });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Training failed");
      }
      await fetchModels();
      const data = await res.json();
      setSelectedId(data.id);
      await loadModelDetails(data.id);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Training failed");
    } finally {
      clearInterval(timer);
      setTraining(false);
    }
  };

  const loadModelDetails = async (modelId: string) => {
    setSelectedId(modelId);
    setPredictionResult(null);
    try {
      const [detailRes, importanceRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/auto-ml/models/${modelId}`),
        fetch(`${API_BASE_URL}/api/auto-ml/models/${modelId}/feature-importance`),
      ]);
      const detailData = await detailRes.json();
      const importanceData = await importanceRes.json();
      setModelDetail(detailData);
      setImportance(importanceData.features ?? []);
    } catch (err) {
      console.error(err);
    }
  };

  const runEvaluation = async () => {
    if (!selectedId) return;
    setEvaluation(null);
    try {
      const form = new FormData();
      if (file) form.append("file", file);
      if (!file && sqlQuery.trim()) form.append("sql_query", sqlQuery.trim());
      if (targetColumn) form.append("target_col", targetColumn);

      const res = await fetch(`${API_BASE_URL}/api/auto-ml/models/${selectedId}/evaluate`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Evaluation failed");
      }
      const data = await res.json();
      setEvaluation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    }
  };

  const handlePredict = async (features: Record<string, string>) => {
    if (!selectedId) return;
    setPredictionLoading(true);
    setPredictionResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auto-ml/models/${selectedId}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Prediction failed");
      }
      const data = await res.json();
      setPredictionResult({
        prediction: data.predictions?.[0],
        confidence: data.confidence?.[0] ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setPredictionLoading(false);
    }
  };

  const datasetHint = useMemo(() => {
    if (file) return `Using file: ${file.name}`;
    if (sqlQuery.trim()) return "Using SQL query";
    return "No dataset selected";
  }, [file, sqlQuery]);

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-foreground">Auto-ML Studio</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Train multiple algorithms, compare metrics, and deploy a production-ready model with a single click.
        </p>
        <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300">{datasetHint}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Dataset & Target</h3>
              {training && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Training… {progress}%
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Upload CSV</label>
                <Input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model Name</label>
                <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="AutoML Forecast" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SQL Query (optional)</label>
                <Textarea
                  value={sqlQuery}
                  onChange={(e) => {
                    setSqlQuery(e.target.value);
                    if (e.target.value.trim()) setFile(null);
                  }}
                  placeholder="SELECT * FROM sales_table"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Column</label>
                <Input
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  placeholder={columns.length ? "Pick a column" : "e.g. outcome"}
                  list="target-columns"
                />
                {columns.length > 0 && (
                  <datalist id="target-columns">
                    {columns.map((col) => (
                      <option key={col} value={col} />
                    ))}
                  </datalist>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button className="gradient-btn" onClick={trainModel} disabled={training}>
                {training ? "Training…" : "Train Model"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Trained Models</h3>
            {models.length === 0 ? (
              <p className="text-sm text-muted-foreground">No models trained yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {models.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    active={model.id === selectedId}
                    onSelect={loadModelDetails}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Model Details</h3>
            {modelDetail ? (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300">{modelDetail.task_type}</Badge>
                  <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300">{modelDetail.algorithm}</Badge>
                  <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                    Accuracy/R²: {modelDetail.accuracy?.toFixed(3)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Target: {modelDetail.target_col ?? "—"} · Features: {modelDetail.feature_count}
                </div>
                <FeatureImportanceChart data={importance} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a model to view details.</p>
            )}
          </div>

          <div className="glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Evaluation</h3>
              <Button variant="outline" onClick={runEvaluation} disabled={!selectedId}>
                Run Evaluation
              </Button>
            </div>
            {evaluation ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  {Object.entries(evaluation.metrics ?? {}).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                      <p className="uppercase tracking-widest">{key}</p>
                      <p className="text-lg font-semibold text-foreground">{value.toFixed(3)}</p>
                    </div>
                  ))}
                </div>
                {evaluation.confusion_matrix && (
                  <ConfusionMatrix labels={evaluation.confusion_matrix.labels} matrix={evaluation.confusion_matrix.matrix} />
                )}
                {evaluation.sample_predictions?.length ? (
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p className="font-semibold uppercase tracking-wider">Sample Predictions</p>
                    <div className="space-y-1">
                      {evaluation.sample_predictions.map((row, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                          <span>Actual: {row.actual}</span>
                          <span>Predicted: {row.predicted}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Upload a dataset and run evaluation to see metrics.</p>
            )}
          </div>

          <div className="glass-card rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Make Prediction</h3>
            {modelDetail?.feature_names?.length ? (
              <PredictionForm
                features={modelDetail.feature_names}
                onPredict={handlePredict}
                loading={predictionLoading}
                result={predictionResult}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Select a model to enable predictions.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
