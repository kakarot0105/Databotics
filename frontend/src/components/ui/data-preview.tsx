"use client";

import { cn } from "@/lib/utils";

export type CellIssues = Record<string, Record<string, string[]>>;

interface DataPreviewProps {
  columns: string[];
  rows: Record<string, unknown>[];
  cellIssues?: CellIssues;
  columnHealth?: Record<string, "healthy" | "warning" | "critical">;
}

const issueClassMap: Record<string, string> = {
  missing: "bg-red-500/15 text-red-200",
  outlier: "bg-amber-500/15 text-amber-200",
  duplicate: "bg-orange-500/15 text-orange-200",
  format: "bg-violet-500/15 text-violet-200",
};

function getCellClass(issues?: string[]) {
  if (!issues?.length) return "";
  if (issues.includes("missing")) return issueClassMap.missing;
  if (issues.includes("outlier")) return issueClassMap.outlier;
  if (issues.includes("duplicate")) return issueClassMap.duplicate;
  if (issues.includes("format")) return issueClassMap.format;
  return "bg-white/5";
}

const headerHealthStyles: Record<string, string> = {
  healthy: "bg-emerald-400",
  warning: "bg-amber-400",
  critical: "bg-red-400",
};

export function DataPreview({ columns, rows, cellIssues, columnHealth }: DataPreviewProps) {
  return (
    <div className="glass-card overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 bg-[#0b0f1d]">
          <tr>
            {columns.map((col) => (
              <th key={col} className="border-b border-white/10 px-4 py-3 text-left font-semibold text-foreground">
                <div className="flex items-center gap-2">
                  {columnHealth?.[col] && (
                    <span className={cn("h-2.5 w-2.5 rounded-full", headerHealthStyles[columnHealth[col]])} />
                  )}
                  <span>{col}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-white/5">
              {columns.map((col) => {
                const issues = cellIssues?.[String(rowIndex)]?.[col];
                return (
                  <td key={`${rowIndex}-${col}`} className={cn("px-4 py-2 text-muted-foreground", getCellClass(issues))}>
                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
