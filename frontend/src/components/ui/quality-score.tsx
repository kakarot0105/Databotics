"use client";

import { cn } from "@/lib/utils";

interface QualityScoreProps {
  score: number;
  size?: number;
  className?: string;
}

function getScoreColor(score: number) {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-amber-400";
  return "text-red-400";
}

export function QualityScore({ score, size = 120, className }: QualityScoreProps) {
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="fill-none stroke-white/10"
            strokeWidth={10}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={cn("fill-none", getScoreColor(score))}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-2xl font-bold", getScoreColor(score))}>{Math.round(score)}</span>
          <span className="text-xs text-muted-foreground">Quality</span>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Data Quality Score</p>
        <p className="text-xs text-muted-foreground">Based on missing values, outliers, duplicates, and format issues.</p>
      </div>
    </div>
  );
}
