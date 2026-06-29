import { Component, computed, effect, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { RelativesStore } from '../../../application/relatives.store';
import { DeviceStore } from '../../../../organization/application/device.store';
import { ClinicalStore } from '../../../../clinical/application/clinical.store';
import { HeartRate } from '../../../../organization/presentation/components/heart-rate/heart-rate';
import { OxygenSaturation } from '../../../../organization/presentation/components/oxygen-saturation/oxygen-saturation';
import { TemperatureRate } from '../../../../organization/presentation/components/temperature-rate/temperature-rate';
import { DeviceDegradedBanner } from '../../../../organization/presentation/components/device-degraded-banner/device-degraded-banner';
import {
  formatVitalTimeLabel,
  sortByMeasuredAt,
  VitalTimePoint,
} from '../../../../shared/utils/vital-chart.utils';

const MEASUREMENT_REFRESH_MS = 15_000;

export interface LatestVitalReading {
  value: number;
  measuredAt: string;
}

@Component({
  selector: 'app-statistic',
  standalone: true,
  imports: [
    CommonModule,
    HeartRate,
    OxygenSaturation,
    TemperatureRate,
    MatProgressSpinnerModule,
    TranslatePipe,
    DeviceDegradedBanner,
  ],
  templateUrl: './statistic.html',
  styleUrl: './statistic.css',
})
export class Statistic implements OnInit, OnDestroy {
  private relativeStore = inject(RelativesStore);
  private deviceStore = inject(DeviceStore);
  private clinicalStore = inject(ClinicalStore);
  private route = inject(ActivatedRoute);
  private measurementRefreshTimer?: ReturnType<typeof setInterval>;

  relative = computed(() => this.relativeStore.selectedRelative());
  seniorCitizenId = computed(() => this.relative()?.seniorCitizenId ?? null);
  deviceId = computed(() => {
    const sc = this.relative()?.seniorCitizen;
    return sc?.deviceId ? Number(sc.deviceId) : 0;
  });
  patientThreshold = computed(() => this.clinicalStore.patientThreshold());
  isDegraded = computed(() => {
    const id = this.deviceId();
    return id > 0 && this.deviceStore.isDeviceDataDegraded(id)();
  });
  lastSyncedAt = computed(() => {
    const id = this.deviceId();
    return id > 0 ? this.deviceStore.getLastSyncedAt(id)() : null;
  });

  thresholdMinBpm = computed(() => this.patientThreshold()?.minBpm ?? 60);
  thresholdMaxBpm = computed(() => this.patientThreshold()?.maxBpm ?? 100);
  thresholdMinSpo2 = computed(() => this.patientThreshold()?.minSpo2 ?? 90);
  thresholdMinCelsius = computed(() => this.patientThreshold()?.minCelsius ?? 36.0);
  thresholdMaxCelsius = computed(() => this.patientThreshold()?.maxCelsius ?? 37.5);

  initialLoading = computed(
    () => this.deviceStore.loadingMeasurements() && !this.hasAnyMeasurements()
  );

  heartRateMeasurements = computed(() => {
    const deviceId = this.deviceId();
    if (!deviceId) return [];
    return this.deviceStore.getHeartRateMeasurementsForDevice(deviceId)();
  });

  temperatureMeasurements = computed(() => {
    const deviceId = this.deviceId();
    if (!deviceId) return [];
    return this.deviceStore.getTemperatureMeasurementsForDevice(deviceId)();
  });

  oxygenMeasurements = computed(() => {
    const deviceId = this.deviceId();
    if (!deviceId) return [];
    return this.deviceStore.getOxygenMeasurementsForDevice(deviceId)();
  });

  heartRatePoints = computed<VitalTimePoint[]>(() =>
    sortByMeasuredAt(this.heartRateMeasurements()).map((m) => ({
      value: m.bpm,
      measuredAt: m.measuredAt,
    }))
  );

  temperaturePoints = computed<VitalTimePoint[]>(() =>
    sortByMeasuredAt(this.temperatureMeasurements()).map((m) => ({
      value: m.temperature,
      measuredAt: m.measuredAt,
    }))
  );

  oxygenPoints = computed<VitalTimePoint[]>(() =>
    sortByMeasuredAt(this.oxygenMeasurements()).map((m) => ({
      value: m.saturation,
      measuredAt: m.measuredAt,
    }))
  );

  latestHeartRate = computed(() => this.latestFromPoints(this.heartRatePoints()));
  latestOxygen = computed(() => this.latestFromPoints(this.oxygenPoints()));
  latestTemperature = computed(() => this.latestFromPoints(this.temperaturePoints()));

  heartRateOutOfRange = computed(() => {
    const latest = this.latestHeartRate();
    if (!latest) return false;
    return latest.value < this.thresholdMinBpm() || latest.value > this.thresholdMaxBpm();
  });

  oxygenOutOfRange = computed(() => {
    const latest = this.latestOxygen();
    if (!latest) return false;
    return latest.value < this.thresholdMinSpo2();
  });

  temperatureOutOfRange = computed(() => {
    const latest = this.latestTemperature();
    if (!latest) return false;
    return latest.value < this.thresholdMinCelsius() || latest.value > this.thresholdMaxCelsius();
  });

  formatMeasuredAt(measuredAt: string): string {
    return formatVitalTimeLabel(measuredAt);
  }

  constructor() {
    effect(() => {
      const deviceId = this.deviceId();
      const seniorCitizenId = this.seniorCitizenId();
      if (deviceId > 0) {
        this.deviceStore.loadAllMeasurementsForDevice(deviceId);
      }
      if (seniorCitizenId) {
        this.clinicalStore.loadPatientThreshold(seniorCitizenId);
      }
    });
  }

  ngOnInit(): void {
    this.loadRelative();
    this.measurementRefreshTimer = setInterval(() => {
      const deviceId = this.deviceId();
      if (deviceId > 0) {
        this.deviceStore.loadAllMeasurementsForDevice(deviceId, { showLoading: false });
      }
    }, MEASUREMENT_REFRESH_MS);
  }

  ngOnDestroy(): void {
    if (this.measurementRefreshTimer) {
      clearInterval(this.measurementRefreshTimer);
    }
    const deviceId = this.deviceId();
    if (deviceId > 0) {
      this.deviceStore.clearMeasurementsForDevice(deviceId);
    }
  }

  private hasAnyMeasurements(): boolean {
    return this.heartRatePoints().length > 0
      || this.temperaturePoints().length > 0
      || this.oxygenPoints().length > 0;
  }

  private loadRelative(): void {
    const relativeId = this.route.snapshot.parent?.params['id'];
    if (relativeId) {
      const id = parseInt(relativeId, 10);
      if (id) {
        this.relativeStore.loadRelativeById(id);
      }
    }
  }

  private latestFromPoints(points: VitalTimePoint[]): LatestVitalReading | null {
    const last = points.at(-1);
    if (!last || !Number.isFinite(last.value)) {
      return null;
    }
    return { value: last.value, measuredAt: last.measuredAt };
  }
}
