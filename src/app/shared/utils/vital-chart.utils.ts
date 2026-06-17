export interface VitalTimePoint {
  value: number;
  measuredAt: string;
}

/**
 * Devices serializes LocalDateTime without offset (VM UTC). Treat naive ISO as UTC
 * so the chart shows the user's local wall-clock time.
 */
export function parseMeasuredAt(iso: string): Date {
  const trimmed = iso?.trim() ?? '';
  if (!trimmed) {
    return new Date(NaN);
  }
  const hasTimezone = trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed);
  return new Date(hasTimezone ? trimmed : `${trimmed}Z`);
}

export function sortByMeasuredAt<T extends { measuredAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => parseMeasuredAt(a.measuredAt).getTime() - parseMeasuredAt(b.measuredAt).getTime()
  );
}

/** X-axis label: local time of arrival; includes ms when present. */
export function formatVitalTimeLabel(measuredAt: string): string {
  const date = parseMeasuredAt(measuredAt);
  if (Number.isNaN(date.getTime())) {
    return measuredAt;
  }

  const time = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const fractional = measuredAt.match(/\.(\d{1,6})/)?.[1];
  if (fractional) {
    const sub = fractional.padEnd(6, '0');
    return `${time}.${sub.slice(-3)}`;
  }
  return time;
}

export interface VitalChartPoint {
  x: number;
  y: number;
}

/**
 * Map vitals to Chart.js {x,y} using epoch ms on X.
 * Duplicate timestamps (demo batch) get a small horizontal offset so each signal is visible.
 */
export function toVitalChartPoints(points: VitalTimePoint[]): VitalChartPoint[] {
  const sorted = sortByMeasuredAt(points);
  const seenAt = new Map<number, number>();

  return sorted.map((point) => {
    const baseX = parseMeasuredAt(point.measuredAt).getTime();
    const duplicateIndex = seenAt.get(baseX) ?? 0;
    seenAt.set(baseX, duplicateIndex + 1);
    return {
      x: baseX + duplicateIndex * 1000,
      y: point.value,
    };
  });
}

export function vitalChartXBounds(points: VitalChartPoint[]): { min: number; max: number } | undefined {
  if (!points.length) {
    return undefined;
  }
  const xs = points.map((p) => p.x);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  const span = Math.max(max - min, 60_000);
  const pad = Math.max(span * 0.08, 5_000);
  return { min: min - pad, max: max + pad };
}

export function formatChartAxisTick(value: number | string): string {
  const ms = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(ms)) {
    return '';
  }
  return formatVitalTimeLabel(new Date(ms).toISOString());
}
