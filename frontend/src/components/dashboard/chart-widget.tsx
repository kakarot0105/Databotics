"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { WidgetConfigState } from "./widget-config";
import { WidgetType } from "./widget-toolbar";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

interface ChartWidgetProps {
  data: Record<string, any>[];
  type: WidgetType;
  config: WidgetConfigState;
}

export function ChartWidget({ data, type, config }: ChartWidgetProps) {
  const xKey = config.xKey ?? config.labelKey;
  const yKey = config.yKey ?? config.valueKey;
  const color = config.color ?? "#6366f1";
  const showLegend = config.showLegend ?? true;

  if (!data.length) {
    return <div className="text-sm text-muted-foreground">Run a query or upload data to render charts.</div>;
  }

  if (!xKey && type !== "pie_chart") {
    return <div className="text-sm text-muted-foreground">Select X and Y axes in configuration.</div>;
  }

  if (!yKey && type !== "pie_chart") {
    return <div className="text-sm text-muted-foreground">Select a value column in configuration.</div>;
  }

  if (type === "bar_chart") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey={xKey} tick={{ fill: "#9ca3af" }} />
          <YAxis tick={{ fill: "#9ca3af" }} />
          <Tooltip />
          {showLegend && <Legend />}
          <Bar dataKey={yKey} fill={color} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line_chart") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey={xKey} tick={{ fill: "#9ca3af" }} />
          <YAxis tick={{ fill: "#9ca3af" }} />
          <Tooltip />
          {showLegend && <Legend />}
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area_chart") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.6} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey={xKey} tick={{ fill: "#9ca3af" }} />
          <YAxis tick={{ fill: "#9ca3af" }} />
          <Tooltip />
          {showLegend && <Legend />}
          <Area type="monotone" dataKey={yKey} stroke={color} fill="url(#areaColor)" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (type === "scatter_plot") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis dataKey={xKey} tick={{ fill: "#9ca3af" }} />
          <YAxis dataKey={yKey} tick={{ fill: "#9ca3af" }} />
          <Tooltip />
          {showLegend && <Legend />}
          <Scatter data={data} fill={color} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (type === "pie_chart") {
    const labelKey = config.labelKey ?? xKey ?? Object.keys(data[0] ?? {})[0];
    const valueKey = config.valueKey ?? yKey ?? Object.keys(data[0] ?? {})[1];
    if (!labelKey || !valueKey) {
      return <div className="text-sm text-muted-foreground">Select label and value columns.</div>;
    }
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Tooltip />
          {showLegend && <Legend />}
          <Pie data={data} dataKey={valueKey} nameKey={labelKey} outerRadius={90}>
            {data.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
