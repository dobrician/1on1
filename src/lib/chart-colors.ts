/**
 * Deterministic color assignment for chart series.
 * The same text always maps to the same color — consistent across all charts.
 */
export const CHART_PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981",
  "#06b6d4", "#f97316", "#84cc16", "#ef4444", "#14b8a6",
] as const;

export function hashSeriesColor(text: string): string {
  let sum = 0;
  for (let i = 0; i < text.length; i++) sum += text.charCodeAt(i);
  return CHART_PALETTE[sum % CHART_PALETTE.length];
}
