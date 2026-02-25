const DEFAULT_SERIES_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];

export function getSeriesColor(
  index: number,
  explicitColor?: string,
  fallbackColor?: string,
): string {
  if (typeof explicitColor === "string" && explicitColor.trim().length > 0) {
    return explicitColor;
  }

  const normalizedIndex = Number.isFinite(index) ? Math.abs(Math.trunc(index)) : 0;
  const paletteColor = DEFAULT_SERIES_COLORS[normalizedIndex % DEFAULT_SERIES_COLORS.length];
  if (paletteColor) {
    return paletteColor;
  }

  return fallbackColor ?? "hsl(var(--chart-1))";
}
