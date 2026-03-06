"use client";

import { WidgetConfigState } from "./widget-config";

interface KPIWidgetProps {
  data: Record<string, any>[];
  config: WidgetConfigState;
}

export function KPIWidget({ data, config }: KPIWidgetProps) {
  const valueKey = config.valueKey ?? config.yKey;
  const labelKey = config.labelKey ?? config.xKey;
  const value = valueKey && data[0] ? data[0][valueKey] : undefined;
  const label = labelKey && data[0] ? data[0][labelKey] : config.title;
  const color = config.color ?? "#6366f1";

  const trend = config.trend ?? 0;
  const trendUp = trend > 0;

  return (
    <div className="flex h-full flex-col justify-between space-y-4">
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="mt-2 text-4xl font-bold text-foreground">
          {value !== undefined && value !== null ? (typeof value === "number" ? value.toLocaleString() : value) : "—"}
        </p>
      </div>
      {trend !== undefined && (
        <div className={`inline-flex items-center gap-1 text-xs font-semibold ${trendUp ? "text-emerald-400" : "text-red-400"}`}>
          <span>{trendUp ? "↑" : "↓"}</span>
          <span>{Math.abs(trend)}% from last period</span>
        </div>
      )}
    </div>
  );
}
