import { Alert } from '../domain/model/alert.entity';
import {
  HeartRateMeasurement,
  OxygenMeasurement,
  TemperatureMeasurement
} from '../domain/model/measurement.entity';

const STORAGE_PREFIX = 'meditrack:device-snapshot:';

export interface DeviceVitalsSnapshot {
  syncedAt: string;
  heartRate: HeartRateMeasurement[];
  temperature: TemperatureMeasurement[];
  oxygen: OxygenMeasurement[];
  alerts: Alert[];
}

function storageKey(deviceId: number): string {
  return `${STORAGE_PREFIX}${deviceId}`;
}

function serializeMeasurement<T>(items: T[]): unknown[] {
  return items;
}

function deserializeHeartRate(items: unknown[]): HeartRateMeasurement[] {
  return (items ?? []).map(item => new HeartRateMeasurement(item));
}

function deserializeTemperature(items: unknown[]): TemperatureMeasurement[] {
  return (items ?? []).map(item => new TemperatureMeasurement(item));
}

function deserializeOxygen(items: unknown[]): OxygenMeasurement[] {
  return (items ?? []).map(item => new OxygenMeasurement(item));
}

function deserializeAlerts(items: unknown[]): Alert[] {
  return (items ?? []).map(item => new Alert(item));
}

export function readDeviceVitalsSnapshot(deviceId: number): DeviceVitalsSnapshot | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(storageKey(deviceId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as {
      syncedAt?: string;
      heartRate?: unknown[];
      temperature?: unknown[];
      oxygen?: unknown[];
      alerts?: unknown[];
    };

    return {
      syncedAt: parsed.syncedAt ?? '',
      heartRate: deserializeHeartRate(parsed.heartRate ?? []),
      temperature: deserializeTemperature(parsed.temperature ?? []),
      oxygen: deserializeOxygen(parsed.oxygen ?? []),
      alerts: deserializeAlerts(parsed.alerts ?? [])
    };
  } catch {
    return null;
  }
}

export function writeDeviceVitalsSnapshot(deviceId: number, snapshot: DeviceVitalsSnapshot): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(storageKey(deviceId), JSON.stringify({
      syncedAt: snapshot.syncedAt,
      heartRate: serializeMeasurement(snapshot.heartRate),
      temperature: serializeMeasurement(snapshot.temperature),
      oxygen: serializeMeasurement(snapshot.oxygen),
      alerts: serializeMeasurement(snapshot.alerts)
    }));
  } catch {
    // Ignore quota or private mode errors.
  }
}

export function snapshotHasMeasurements(snapshot: DeviceVitalsSnapshot | null): boolean {
  if (!snapshot) {
    return false;
  }

  return snapshot.heartRate.length > 0
    || snapshot.temperature.length > 0
    || snapshot.oxygen.length > 0;
}

export function snapshotHasAlerts(snapshot: DeviceVitalsSnapshot | null): boolean {
  return !!snapshot && snapshot.alerts.length > 0;
}
