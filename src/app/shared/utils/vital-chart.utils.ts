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

/** One point per bucket; null y breaks the line across long outages. */
export type VitalChartDatum = VitalChartPoint | { x: number; y: null };

/** One chart point per minute — readable trend for burst / batch IoT uploads. */
export const VITAL_CHART_BUCKET_MS = 60_000;

/** Only the most recent window is plotted so sessions are not tiny spikes on a full-day axis. */
export const VITAL_CHART_WINDOW_MS = 4 * 60 * 60_000;

/** Gaps longer than this break the line (offline / no signal between sessions). */
export const VITAL_CHART_MAX_GAP_MS = 3 * 60_000;

function roundVitalValue(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Average readings per minute, keep the last N hours, break long gaps.
 * Matches how clinical trend views summarize streaming vitals.
 */
export function toVitalChartPoints(points: VitalTimePoint[]): VitalChartDatum[] {
  const sorted = sortByMeasuredAt(points).filter((point) => Number.isFinite(point.value));

  const buckets = new Map<number, { sum: number; count: number }>();
  for (const point of sorted) {
    const ms = parseMeasuredAt(point.measuredAt).getTime();
    if (!Number.isFinite(ms)) {
      continue;
    }
    const bucketKey = Math.floor(ms / VITAL_CHART_BUCKET_MS) * VITAL_CHART_BUCKET_MS;
    const bucket = buckets.get(bucketKey) ?? { sum: 0, count: 0 };
    bucket.sum += point.value;
    bucket.count += 1;
    buckets.set(bucketKey, bucket);
  }

  let bucketed: VitalChartPoint[] = Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([x, { sum, count }]) => ({ x, y: roundVitalValue(sum / count) }));

  if (bucketed.length) {
    const latestX = bucketed[bucketed.length - 1].x;
    const windowStart = latestX - VITAL_CHART_WINDOW_MS;
    bucketed = bucketed.filter((point) => point.x >= windowStart);
  }

  const result: VitalChartDatum[] = [];
  let prevX: number | null = null;
  for (const point of bucketed) {
    if (prevX !== null && point.x - prevX > VITAL_CHART_MAX_GAP_MS) {
      result.push({ x: point.x - 1, y: null });
    }
    result.push(point);
    prevX = point.x;
  }

  return result;
}

export function vitalChartValidPoints(points: VitalChartDatum[]): VitalChartPoint[] {
  return points.filter((p): p is VitalChartPoint => p.y !== null);
}

export function vitalChartPointRadius(pointCount: number): number {
  if (pointCount > 8) {
    return 0;
  }
  return 3;
}

export function vitalChartDefaultXBounds(): { min: number; max: number } {
  const now = Date.now();
  return { min: now - 60 * 60_000, max: now + 5_000 };
}

export function vitalChartXBounds(points: VitalChartDatum[]): { min: number; max: number } {
  const valid = vitalChartValidPoints(points);
  if (!valid.length) {
    return vitalChartDefaultXBounds();
  }
  const max = valid[valid.length - 1].x;
  const min = Math.max(valid[0].x, max - VITAL_CHART_WINDOW_MS);
  const span = Math.max(max - min, 5 * VITAL_CHART_BUCKET_MS);
  const pad = Math.min(Math.max(span * 0.04, 30_000), 5 * 60_000);
  return { min: min - pad, max: max + pad };
}

export function vitalChartTemperatureYBounds(
  points: VitalChartDatum[],
  thresholdMin: number,
  thresholdMax: number,
): { min: number; max: number } {
  let min = thresholdMin - 1;
  let max = thresholdMax + 1;
  const valid = vitalChartValidPoints(points);
  if (valid.length) {
    const ys = valid.map((p) => p.y);
    min = Math.min(min, Math.floor(Math.min(...ys) - 0.5));
    max = Math.max(max, Math.ceil(Math.max(...ys) + 0.5));
  }
  return { min, max };
}

export function formatChartAxisTick(value: number | string): string {
  const ms = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(ms)) {
    return '';
  }
  const date = new Date(ms);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Wall-clock label for alerts/measurements (naive API timestamps treated as UTC). */
export function formatAlertWhen(iso: string): string {
  const date = parseMeasuredAt(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const day = date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  });
  const time = formatVitalTimeLabel(iso);
  return `${day}, ${time}`;
}

export function alertTimestampMs(iso: string | undefined): number {
  if (!iso?.trim()) {
    return 0;
  }
  const ms = parseMeasuredAt(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}
