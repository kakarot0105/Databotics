"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Issue = {
  id: string;
  type: string;
  severity: "high" | "medium" | "low";
  columns: string[];
  row_count: number;
  message: string;
  suggested_fix?: Record<string, unknown>;
  preview?: {
    before?: string | number | null;
    after?: string | number | null;
  };
};

const severityStyles = {
  high: "border-red-500/30 bg-red-500/10 text-red-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

export function IssueCard({ issue, onApply, disabled }: { issue: Issue; onApply?: (issue: Issue) => void; disabled?: boolean }) {
  return (
    <Card className="glass-card space-y-4 rounded-2xl border border-white/10 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground capitalize">{issue.type.replace("_", " ")}</p>
            <Badge className={cn("border", severityStyles[issue.severity])}>{issue.severity}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{issue.message}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{issue.row_count} rows</p>
          <p>{issue.columns.join(", ")}</p>
        </div>
      </div>

      {issue.preview?.before !== undefined && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Before</span>
            <span className="text-foreground">{String(issue.preview.before)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">After</span>
            <span className="text-foreground">{String(issue.preview.after ?? "—")}</span>
          </div>
        </div>
      )}

      <Button
        className="w-full"
        variant="secondary"
        disabled={disabled}
        onClick={() => onApply?.(issue)}
      >
        Apply Suggested Fix
      </Button>
    </Card>
  );
}
