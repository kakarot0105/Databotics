"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface FeatureImportanceEntry {
  feature: string;
  importance: number;
}

export function FeatureImportanceChart({ data }: { data: FeatureImportanceEntry[] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No feature importance available for this model.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} />
          <YAxis
            dataKey="feature"
            type="category"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            width={140}
          />
          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }} />
          <Bar dataKey="importance" fill="#8b5cf6" radius={[6, 6, 6, 6]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
