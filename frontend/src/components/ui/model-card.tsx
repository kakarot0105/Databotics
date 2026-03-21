"use client";

import { Card } from "./card";
import { Badge } from "./badge";
import { Cpu, Calendar, Layers } from "lucide-react";

export interface ModelSummary {
  id: string;
  name: string;
  task_type: string;
  algorithm: string;
  accuracy: number | null;
  feature_count: number;
  created_at: string;
  dataset_size?: number | null;
}

export function ModelCard({
  model,
  active,
  onSelect,
}: {
  model: ModelSummary;
  active?: boolean;
  onSelect?: (id: string) => void;
}) {
  return (
    <Card
      onClick={() => onSelect?.(model.id)}
      className={`cursor-pointer rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-indigo-500/40 hover:bg-white/[0.04] ${
        active ? "border-indigo-500/60 bg-indigo-500/10" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{model.name}</p>
          <p className="text-xs text-muted-foreground">{model.task_type}</p>
        </div>
        <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300">{model.algorithm}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-indigo-300" />
          <span>{model.accuracy !== null ? model.accuracy.toFixed(3) : "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-indigo-300" />
          <span>{model.feature_count} features</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-indigo-300" />
          <span>{new Date(model.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase text-muted-foreground">Rows</span>
          <span>{model.dataset_size ?? "—"}</span>
        </div>
      </div>
    </Card>
  );
}
