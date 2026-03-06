"use client";

import { WidgetConfigState } from "./widget-config";

interface StatWidgetProps {
  data: Record<string, any>[];
  config: WidgetConfigState;
}

export function StatWidget({ data, config }: StatWidgetProps) {
  const valueKey = config.valueKey ?? config.yKey;
  const first = data[0] ?? {};
  const value = valueKey ? first[valueKey] : undefined;

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <p className="text-xs text-muted-foreground">Current</p>
        <p className="text-3xl font-semibold text-foreground">{value !== undefined && value !== null ? value : "--"}</p>
      </div>
      <div className="text-xs text-muted-foreground">Auto-updates on refresh</div>
    </div>
  );
}
