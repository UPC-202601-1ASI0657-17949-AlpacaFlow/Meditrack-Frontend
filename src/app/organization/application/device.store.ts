import { computed, Injectable, signal, Signal } from '@angular/core';
import { Device } from '../domain/model/device.entity';
import { Alert } from '../domain/model/alert.entity';
import {
  HeartRateMeasurement,
  TemperatureMeasurement,
  OxygenMeasurement
} from '../domain/model/measurement.entity';
import { DeviceApi } from '../infrastructure/device-api';
import {
  DeviceVitalsSnapshot,
  readDeviceVitalsSnapshot,
  snapshotHasAlerts,
  snapshotHasMeasurements,
  writeDeviceVitalsSnapshot
} from '../infrastructure/device-vitals-cache';
import { sortByMeasuredAt, alertTimestampMs } from '../../shared/utils/vital-chart.utils';

const HIDDEN_DEVICES_STORAGE_KEY = 'meditrack:ui-hidden-device-ids';
/** Keep memory and sessionStorage bounded for chart / degraded mode. */
const MAX_MEASUREMENTS_PER_DEVICE = 400;
const MAX_ALERTS_PER_DEVICE = 50;

function trimMeasurements<T extends { measuredAt: string }>(items: T[]): T[] {
  if (items.length <= MAX_MEASUREMENTS_PER_DEVICE) {
    return items;
  }
  return sortByMeasuredAt(items).slice(-MAX_MEASUREMENTS_PER_DEVICE);
}

function trimAlerts(alerts: Alert[]): Alert[] {
  if (alerts.length <= MAX_ALERTS_PER_DEVICE) {
    return alerts;
  }
  return [...alerts]
    .sort((a, b) => alertTimestampMs(b.registeredAt) - alertTimestampMs(a.registeredAt))
    .slice(0, MAX_ALERTS_PER_DEVICE);
}

function readHiddenDeviceIdsFromStorage(): Set<number> {
  try {
    const raw = localStorage.getItem(HIDDEN_DEVICES_STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id): id is number => typeof id === 'number' && id > 0));
  } catch {
    return new Set();
  }
}

function writeHiddenDeviceIdsToStorage(ids: Set<number>): void {
  try {
    localStorage.setItem(HIDDEN_DEVICES_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignore storage quota or private mode errors.
  }
}

/**
 * DeviceStore
 * State management store for devices, measurements, and alerts using Angular signals.
 * Applies client-side degraded mode (TS9): keeps last known vitals when devices API fails.
 */
@Injectable({
  providedIn: 'root'
})
export class DeviceStore {
  private readonly devicesSignal = signal<Device[]>([]);
  readonly devices = this.devicesSignal.asReadonly();

  /** Device IDs hidden from the IoT list UI only (persisted in localStorage for this browser). */
  private readonly hiddenFromListIdsSignal = signal<Set<number>>(readHiddenDeviceIdsFromStorage());
  readonly hiddenFromListIds = this.hiddenFromListIdsSignal.asReadonly();

  readonly visibleDevices = computed(() =>
    this.devices().filter(device => device.id != null && !this.hiddenFromListIdsSignal().has(device.id))
  );

  private readonly selectedDeviceSignal = signal<Device | null>(null);
  readonly selectedDevice = this.selectedDeviceSignal.asReadonly();

  readonly deviceCount = computed(() => this.devices().length);

  private readonly alertsSignal = signal<Alert[]>([]);
  readonly alerts = this.alertsSignal.asReadonly();

  private readonly deviceAlertsSignal = signal<Map<number, Alert[]>>(new Map());
  readonly deviceAlerts = this.deviceAlertsSignal.asReadonly();

  readonly alertCount = computed(() => this.alerts().length);

  private readonly heartRateMeasurementsSignal = signal<Map<number, HeartRateMeasurement[]>>(new Map());
  readonly heartRateMeasurements = this.heartRateMeasurementsSignal.asReadonly();

  private readonly temperatureMeasurementsSignal = signal<Map<number, TemperatureMeasurement[]>>(new Map());
  readonly temperatureMeasurements = this.temperatureMeasurementsSignal.asReadonly();

  private readonly oxygenMeasurementsSignal = signal<Map<number, OxygenMeasurement[]>>(new Map());
  readonly oxygenMeasurements = this.oxygenMeasurementsSignal.asReadonly();

  private readonly loadingDevicesSignal = signal<boolean>(false);
  readonly loadingDevices = this.loadingDevicesSignal.asReadonly();

  private readonly loadingAlertsSignal = signal<boolean>(false);
  readonly loadingAlerts = this.loadingAlertsSignal.asReadonly();

  private readonly loadingMeasurementsSignal = signal<boolean>(false);
  readonly loadingMeasurements = this.loadingMeasurementsSignal.asReadonly();

  private readonly errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  private readonly degradedDevicesSignal = signal<Set<number>>(new Set());
  private readonly lastSyncedAtSignal = signal<Map<number, string>>(new Map());

  private measurementBatchPending = 0;
  private measurementBatchFailures = 0;
  private readonly alertsInFlight = new Set<number>();
  private readonly measurementsInFlight = new Set<number>();

  private readonly alertsForDeviceCache = new Map<number, Signal<Alert[]>>();
  private readonly heartRateForDeviceCache = new Map<number, Signal<HeartRateMeasurement[]>>();
  private readonly temperatureForDeviceCache = new Map<number, Signal<TemperatureMeasurement[]>>();
  private readonly oxygenForDeviceCache = new Map<number, Signal<OxygenMeasurement[]>>();
  private readonly degradedForDeviceCache = new Map<number, Signal<boolean>>();
  private readonly lastSyncedForDeviceCache = new Map<number, Signal<string | null>>();

  constructor(private deviceApi: DeviceApi) {}

  private cachedDeviceSignal<T>(
    cache: Map<number, Signal<T>>,
    deviceId: number,
    selector: () => T,
  ): Signal<T> {
    let cached = cache.get(deviceId);
    if (!cached) {
      cached = computed(selector);
      cache.set(deviceId, cached);
    }
    return cached;
  }

  /** Hides a device from the IoT table only; does not delete it in the backend. */
  hideDeviceFromList(deviceId: number): void {
    if (deviceId <= 0) {
      return;
    }
    this.hiddenFromListIdsSignal.update(ids => {
      const next = new Set(ids);
      next.add(deviceId);
      writeHiddenDeviceIdsToStorage(next);
      return next;
    });
  }

  isDeviceDataDegraded(deviceId: number): Signal<boolean> {
    return this.cachedDeviceSignal(
      this.degradedForDeviceCache,
      deviceId,
      () => this.degradedDevicesSignal().has(deviceId),
    );
  }

  getLastSyncedAt(deviceId: number): Signal<string | null> {
    return this.cachedDeviceSignal(
      this.lastSyncedForDeviceCache,
      deviceId,
      () => this.lastSyncedAtSignal().get(deviceId) ?? null,
    );
  }

  loadAllDevices(): void {
    this.loadingDevicesSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.getAllDevices().subscribe({
      next: (devices) => {
        this.devicesSignal.set(devices);
        this.loadingDevicesSignal.set(false);
      },
      error: (error) => {
        this.errorSignal.set('Error loading devices: ' + error.message);
        this.loadingDevicesSignal.set(false);
      }
    });
  }

  loadDeviceById(deviceId: number): void {
    this.loadingDevicesSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.getDeviceById(deviceId).subscribe({
      next: (device) => {
        this.selectedDeviceSignal.set(device);
        const devices = this.devicesSignal();
        const index = devices.findIndex(d => d.id === deviceId);
        if (index >= 0) {
          devices[index] = device;
          this.devicesSignal.set([...devices]);
        } else {
          this.devicesSignal.set([...devices, device]);
        }
        this.loadingDevicesSignal.set(false);
      },
      error: (error) => {
        this.errorSignal.set('Error loading device: ' + error.message);
        this.loadingDevicesSignal.set(false);
      }
    });
  }

  createDevice(model: string, holderId: number, holderType: string): void {
    this.loadingDevicesSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.createDevice({ model, holderId, holderType }).subscribe({
      next: (device) => {
        this.devicesSignal.update(devices => [...devices, device]);
        this.loadingDevicesSignal.set(false);
      },
      error: (error) => {
        this.errorSignal.set('Error creating device: ' + error.message);
        this.loadingDevicesSignal.set(false);
      }
    });
  }

  loadAllAlerts(): void {
    this.loadingAlertsSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.getAllAlerts().subscribe({
      next: (alerts) => {
        this.alertsSignal.set(alerts);
        this.loadingAlertsSignal.set(false);
      },
      error: (error) => {
        this.errorSignal.set('Error loading alerts: ' + error.message);
        this.loadingAlertsSignal.set(false);
      }
    });
  }

  loadAlertsByDeviceId(deviceId: number): void {
    if (deviceId <= 0 || this.alertsInFlight.has(deviceId)) {
      return;
    }

    this.alertsInFlight.add(deviceId);
    this.loadingAlertsSignal.set(true);
    this.errorSignal.set(null);
    this.hydrateAlertsFromCache(deviceId);

    this.deviceApi.getAllAlertsByDeviceId(deviceId).subscribe({
      next: (alerts) => {
        const trimmed = trimAlerts(alerts);
        this.deviceAlertsSignal.update(map => {
          const newMap = new Map(map);
          newMap.set(deviceId, trimmed);
          return newMap;
        });
        this.syncAlertsOnly(deviceId);
        this.loadingAlertsSignal.set(false);
        this.alertsInFlight.delete(deviceId);
      },
      error: (error) => {
        const restored = this.restoreAlertsFromCache(deviceId);
        if (restored) {
          this.markDegraded(deviceId);
        } else {
          this.errorSignal.set('Error loading alerts: ' + (error?.message || 'Unknown error'));
        }
        this.loadingAlertsSignal.set(false);
        this.alertsInFlight.delete(deviceId);
      }
    });
  }

  getAlertsForDevice(deviceId: number): Signal<Alert[]> {
    return this.cachedDeviceSignal(
      this.alertsForDeviceCache,
      deviceId,
      () => this.deviceAlertsSignal().get(deviceId) || [],
    );
  }

  loadHeartRateMeasurements(deviceId: number): void {
    this.beginMeasurementRequest();

    this.deviceApi.getAllHeartRateMeasurements(deviceId).subscribe({
      next: (measurements) => {
        const trimmed = trimMeasurements(measurements);
        this.heartRateMeasurementsSignal.update(map => {
          const newMap = new Map(map);
          newMap.set(deviceId, trimmed);
          return newMap;
        });
        this.finishMeasurementRequest(deviceId, false);
      },
      error: (error) => {
        this.errorSignal.set('Error loading HR measurements: ' + error.message);
        this.finishMeasurementRequest(deviceId, true);
      }
    });
  }

  addHeartRateMeasurement(deviceId: number, bpm: number): void {
    this.loadingMeasurementsSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.addHeartRateMeasurement(deviceId, {
      bpm,
      measuredAt: new Date().toISOString()
    }).subscribe({
      next: () => this.loadAllMeasurementsForDevice(deviceId),
      error: (error) => {
        this.errorSignal.set('Error adding HR measurement: ' + error.message);
        this.loadingMeasurementsSignal.set(false);
      }
    });
  }

  getHeartRateMeasurementsForDevice(deviceId: number): Signal<HeartRateMeasurement[]> {
    return this.cachedDeviceSignal(
      this.heartRateForDeviceCache,
      deviceId,
      () => this.heartRateMeasurementsSignal().get(deviceId) || [],
    );
  }

  loadTemperatureMeasurements(deviceId: number): void {
    this.beginMeasurementRequest();

    this.deviceApi.getAllTemperatureMeasurements(deviceId).subscribe({
      next: (measurements) => {
        const trimmed = trimMeasurements(measurements);
        this.temperatureMeasurementsSignal.update(map => {
          const newMap = new Map(map);
          newMap.set(deviceId, trimmed);
          return newMap;
        });
        this.finishMeasurementRequest(deviceId, false);
      },
      error: (error) => {
        this.errorSignal.set('Error loading temp measurements: ' + error.message);
        this.finishMeasurementRequest(deviceId, true);
      }
    });
  }

  addTemperatureMeasurement(deviceId: number, temperature: number): void {
    this.loadingMeasurementsSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.addTemperatureMeasurement(deviceId, {
      celsius: temperature,
      measuredAt: new Date().toISOString()
    }).subscribe({
      next: () => this.loadAllMeasurementsForDevice(deviceId),
      error: (error) => {
        this.errorSignal.set('Error adding temp measurement: ' + error.message);
        this.loadingMeasurementsSignal.set(false);
      }
    });
  }

  getTemperatureMeasurementsForDevice(deviceId: number): Signal<TemperatureMeasurement[]> {
    return this.cachedDeviceSignal(
      this.temperatureForDeviceCache,
      deviceId,
      () => this.temperatureMeasurementsSignal().get(deviceId) || [],
    );
  }

  loadOxygenMeasurements(deviceId: number): void {
    this.beginMeasurementRequest();

    this.deviceApi.getAllOxygenMeasurements(deviceId).subscribe({
      next: (measurements) => {
        const trimmed = trimMeasurements(measurements);
        this.oxygenMeasurementsSignal.update(map => {
          const newMap = new Map(map);
          newMap.set(deviceId, trimmed);
          return newMap;
        });
        this.finishMeasurementRequest(deviceId, false);
      },
      error: (error) => {
        this.errorSignal.set('Error loading O2 measurements: ' + error.message);
        this.finishMeasurementRequest(deviceId, true);
      }
    });
  }

  addOxygenMeasurement(deviceId: number, saturation: number): void {
    this.loadingMeasurementsSignal.set(true);
    this.errorSignal.set(null);

    this.deviceApi.addOxygenMeasurement(deviceId, {
      spo2: saturation,
      measuredAt: new Date().toISOString()
    }).subscribe({
      next: () => this.loadAllMeasurementsForDevice(deviceId),
      error: (error) => {
        this.errorSignal.set('Error adding O2 measurement: ' + error.message);
        this.loadingMeasurementsSignal.set(false);
      }
    });
  }

  getOxygenMeasurementsForDevice(deviceId: number): Signal<OxygenMeasurement[]> {
    return this.cachedDeviceSignal(
      this.oxygenForDeviceCache,
      deviceId,
      () => this.oxygenMeasurementsSignal().get(deviceId) || [],
    );
  }

  loadAllMeasurementsForDevice(deviceId: number, options: { showLoading?: boolean } = {}): void {
    if (deviceId <= 0) {
      return;
    }
    if (this.measurementsInFlight.has(deviceId)) {
      return;
    }
    this.measurementsInFlight.add(deviceId);

    const hasCachedMeasurements = this.hasMeasurementsForDevice(deviceId);
    const showLoading = options.showLoading ?? !hasCachedMeasurements;

    this.measurementBatchPending = 3;
    this.measurementBatchFailures = 0;
    if (showLoading) {
      this.loadingMeasurementsSignal.set(true);
    }
    this.errorSignal.set(null);
    this.hydrateMeasurementsFromCache(deviceId);
    this.clearDegraded(deviceId);

    this.loadHeartRateMeasurements(deviceId);
    this.loadTemperatureMeasurements(deviceId);
    this.loadOxygenMeasurements(deviceId);
  }

  private hasMeasurementsForDevice(deviceId: number): boolean {
    const heartRate = this.heartRateMeasurementsSignal().get(deviceId)?.length ?? 0;
    const temperature = this.temperatureMeasurementsSignal().get(deviceId)?.length ?? 0;
    const oxygen = this.oxygenMeasurementsSignal().get(deviceId)?.length ?? 0;
    return heartRate + temperature + oxygen > 0;
  }

  clearMeasurementsForDevice(deviceId: number): void {
    if (deviceId <= 0) {
      return;
    }
    this.heartRateMeasurementsSignal.update(map => {
      if (!map.has(deviceId)) {
        return map;
      }
      const newMap = new Map(map);
      newMap.delete(deviceId);
      return newMap;
    });
    this.temperatureMeasurementsSignal.update(map => {
      if (!map.has(deviceId)) {
        return map;
      }
      const newMap = new Map(map);
      newMap.delete(deviceId);
      return newMap;
    });
    this.oxygenMeasurementsSignal.update(map => {
      if (!map.has(deviceId)) {
        return map;
      }
      const newMap = new Map(map);
      newMap.delete(deviceId);
      return newMap;
    });
  }

  clearAll(): void {
    this.devicesSignal.set([]);
    this.selectedDeviceSignal.set(null);
    this.alertsSignal.set([]);
    this.deviceAlertsSignal.set(new Map());
    this.heartRateMeasurementsSignal.set(new Map());
    this.temperatureMeasurementsSignal.set(new Map());
    this.oxygenMeasurementsSignal.set(new Map());
    this.degradedDevicesSignal.set(new Set());
    this.lastSyncedAtSignal.set(new Map());
    this.errorSignal.set(null);
  }

  clearError(): void {
    this.errorSignal.set(null);
  }

  private beginMeasurementRequest(): void {
    if (this.measurementBatchPending === 0) {
      this.loadingMeasurementsSignal.set(true);
    }
  }

  private finishMeasurementRequest(deviceId: number, failed: boolean): void {
    if (this.measurementBatchPending > 0) {
      this.measurementBatchPending--;
      if (failed) {
        this.measurementBatchFailures++;
      }
    }

    if (this.measurementBatchPending > 0) {
      return;
    }

    this.loadingMeasurementsSignal.set(false);

    if (this.measurementBatchFailures === 0) {
      this.markHealthy(deviceId);
      this.measurementsInFlight.delete(deviceId);
      return;
    }

    const restored = this.restoreMeasurementsFromCache(deviceId);
    if (restored) {
      this.markDegraded(deviceId);
    }
    this.measurementsInFlight.delete(deviceId);
  }

  private hydrateFromCache(deviceId: number): void {
    this.hydrateMeasurementsFromCache(deviceId);
    this.hydrateAlertsFromCache(deviceId);
    this.hydrateSyncedAtFromCache(deviceId);
  }

  private hydrateMeasurementsFromCache(deviceId: number): void {
    const snapshot = readDeviceVitalsSnapshot(deviceId);
    if (!snapshotHasMeasurements(snapshot)) {
      return;
    }
    this.applyMeasurementsSnapshot(deviceId, snapshot!);
  }

  private hydrateAlertsFromCache(deviceId: number): void {
    const snapshot = readDeviceVitalsSnapshot(deviceId);
    if (!snapshotHasAlerts(snapshot)) {
      return;
    }
    this.deviceAlertsSignal.update(map => {
      const newMap = new Map(map);
      newMap.set(deviceId, snapshot!.alerts);
      return newMap;
    });
  }

  private hydrateSyncedAtFromCache(deviceId: number): void {
    const snapshot = readDeviceVitalsSnapshot(deviceId);
    if (!snapshot?.syncedAt) {
      return;
    }
    this.lastSyncedAtSignal.update(map => {
      const newMap = new Map(map);
      newMap.set(deviceId, snapshot.syncedAt);
      return newMap;
    });
  }

  private restoreMeasurementsFromCache(deviceId: number): boolean {
    const snapshot = readDeviceVitalsSnapshot(deviceId);
    if (!snapshotHasMeasurements(snapshot)) {
      return false;
    }

    this.applyMeasurementsSnapshot(deviceId, snapshot!);
    return true;
  }

  private restoreAlertsFromCache(deviceId: number): boolean {
    const snapshot = readDeviceVitalsSnapshot(deviceId);
    if (!snapshotHasAlerts(snapshot)) {
      return false;
    }

    this.deviceAlertsSignal.update(map => {
      const newMap = new Map(map);
      newMap.set(deviceId, snapshot!.alerts);
      return newMap;
    });
    return true;
  }

  private applyMeasurementsSnapshot(deviceId: number, snapshot: DeviceVitalsSnapshot): void {
    this.heartRateMeasurementsSignal.update(map => {
      const newMap = new Map(map);
      newMap.set(deviceId, trimMeasurements(snapshot.heartRate));
      return newMap;
    });
    this.temperatureMeasurementsSignal.update(map => {
      const newMap = new Map(map);
      newMap.set(deviceId, trimMeasurements(snapshot.temperature));
      return newMap;
    });
    this.oxygenMeasurementsSignal.update(map => {
      const newMap = new Map(map);
      newMap.set(deviceId, trimMeasurements(snapshot.oxygen));
      return newMap;
    });
  }

  private persistSnapshot(deviceId: number): void {
    const syncedAt = new Date().toISOString();
    const heartRate = this.heartRateMeasurementsSignal().get(deviceId) ?? [];
    const temperature = this.temperatureMeasurementsSignal().get(deviceId) ?? [];
    const oxygen = this.oxygenMeasurementsSignal().get(deviceId) ?? [];
    const alerts = this.deviceAlertsSignal().get(deviceId) ?? [];

    const payload: DeviceVitalsSnapshot = {
      syncedAt,
      heartRate: trimMeasurements(heartRate),
      temperature: trimMeasurements(temperature),
      oxygen: trimMeasurements(oxygen),
      alerts: trimAlerts(alerts),
    };

    queueMicrotask(() => writeDeviceVitalsSnapshot(deviceId, payload));

    this.lastSyncedAtSignal.update(map => {
      const newMap = new Map(map);
      newMap.set(deviceId, syncedAt);
      return newMap;
    });
  }

  private markDegraded(deviceId: number): void {
    this.degradedDevicesSignal.update(set => {
      const next = new Set(set);
      next.add(deviceId);
      return next;
    });
  }

  private syncAlertsOnly(deviceId: number): void {
    this.clearDegraded(deviceId);
    const syncedAt = new Date().toISOString();
    const alerts = trimAlerts(this.deviceAlertsSignal().get(deviceId) ?? []);
    const existing = readDeviceVitalsSnapshot(deviceId);

    this.lastSyncedAtSignal.update(map => {
      const newMap = new Map(map);
      newMap.set(deviceId, syncedAt);
      return newMap;
    });

    queueMicrotask(() => {
      writeDeviceVitalsSnapshot(deviceId, {
        syncedAt,
        heartRate: existing?.heartRate ?? [],
        temperature: existing?.temperature ?? [],
        oxygen: existing?.oxygen ?? [],
        alerts,
      });
    });
  }

  private markHealthy(deviceId: number): void {
    this.clearDegraded(deviceId);
    this.persistSnapshot(deviceId);
  }

  private clearDegraded(deviceId: number): void {
    this.degradedDevicesSignal.update(set => {
      if (!set.has(deviceId)) {
        return set;
      }
      const next = new Set(set);
      next.delete(deviceId);
      return next;
    });
  }
}
