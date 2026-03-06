import { ProfileResponse } from "./api";

export interface Insight {
  type: "warning" | "positive" | "neutral";
  text: string;
  icon: string;
}

export function generateInsights(profile: ProfileResponse): Insight[] {
  const insights: Insight[] = [];

  // Check for missing values
  const columnsWithMissing = profile.columns.filter((c) => c.null_pct > 0.1);
  if (columnsWithMissing.length > 0) {
    const worst = columnsWithMissing.reduce((a, b) =>
      a.null_pct > b.null_pct ? a : b
    );
    insights.push({
      type: "warning",
      icon: "⚠️",
      text: `${worst.name} has ${(worst.null_pct * 100).toFixed(1)}% missing values.`,
    });
  }

  // Check for numeric columns with high variance
  const numericCols = profile.columns.filter((c) => c.stats);
  for (const col of numericCols) {
    if (col.stats && col.stats.std && col.stats.mean) {
      const cv = col.stats.std / Math.abs(col.stats.mean || 1); // coefficient of variation
      if (cv > 1) {
        insights.push({
          type: "neutral",
          icon: "📊",
          text: `${col.name} shows high variability (CV: ${cv.toFixed(2)}).`,
        });
        break; // limit to one
      }
    }
  }

  // Check for outliers (values beyond 3 std devs)
  for (const col of numericCols) {
    if (col.stats && col.stats.std && col.stats.mean) {
      const mean = col.stats.mean;
      const std = col.stats.std;
      // rough estimate: if max/min are beyond 3σ
      if (col.stats.max && Math.abs(col.stats.max - mean) > 3 * std) {
        insights.push({
          type: "neutral",
          icon: "🎯",
          text: `${col.name} contains potential outliers (max far from mean).`,
        });
        break;
      }
    }
  }

  // Check for uniform distribution
  const textCols = profile.columns.filter((c) => c.type.includes("object"));
  if (textCols.length > 0 && profile.sample_rows.length > 0) {
    const uniqueVals = new Set(
      profile.sample_rows.map((r) => r[textCols[0].name])
    );
    if (uniqueVals.size === profile.sample_rows.length) {
      insights.push({
        type: "positive",
        icon: "✨",
        text: `${textCols[0].name} has high cardinality—good for grouping.`,
      });
    }
  }

  // Positive: clean data
  if (columnsWithMissing.length === 0) {
    insights.push({
      type: "positive",
      icon: "✅",
      text: "No missing values detected—data quality is clean!",
    });
  }

  return insights.slice(0, 5); // max 5 insights
}
