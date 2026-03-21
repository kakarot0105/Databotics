"use client";

import { cn } from "@/lib/utils";

export interface ConfusionMatrixProps {
  labels: string[];
  matrix: number[][];
}

export function ConfusionMatrix({ labels, matrix }: ConfusionMatrixProps) {
  if (!labels.length || !matrix.length) {
    return <p className="text-sm text-muted-foreground">No confusion matrix available.</p>;
  }

  const maxValue = Math.max(...matrix.flat());

  return (
    <div className="space-y-2">
      <div className="grid" style={{ gridTemplateColumns: `120px repeat(${labels.length}, minmax(0, 1fr))` }}>
        <div />
        {labels.map((label) => (
          <div key={label} className="px-2 py-1 text-center text-xs font-semibold text-muted-foreground">
            {label}
          </div>
        ))}
        {labels.map((rowLabel, rowIndex) => (
          <div key={rowLabel} className="contents">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">{rowLabel}</div>
            {matrix[rowIndex].map((value, colIndex) => {
              const intensity = maxValue ? value / maxValue : 0;
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={cn(
                    "flex items-center justify-center rounded-lg border border-white/5 py-2 text-xs font-semibold text-foreground",
                    "bg-indigo-500/10",
                  )}
                  style={{ opacity: 0.4 + intensity * 0.6 }}
                >
                  {value}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Rows = actual, columns = predicted</p>
    </div>
  );
}
