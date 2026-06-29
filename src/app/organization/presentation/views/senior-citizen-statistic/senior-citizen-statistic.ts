import { Component, computed, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { OrganizationStore } from '../../../application/organization.store';
import { DeviceStore } from '../../../application/device.store';
import { ClinicalStore } from '../../../../clinical/application/clinical.store';
import { HeartRate } from '../../components/heart-rate/heart-rate';
import { OxygenSaturation } from '../../components/oxygen-saturation/oxygen-saturation';
import { TemperatureRate } from '../../components/temperature-rate/temperature-rate';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { DeviceDegradedBanner } from '../../components/device-degraded-banner/device-degraded-banner';
import { sortByMeasuredAt, VitalTimePoint, formatVitalTimeLabel } from '../../../../shared/utils/vital-chart.utils';

const MEASUREMENT_REFRESH_MS = 15_000;

export interface LatestVitalReading {
  value: number;
  measuredAt: string;
}

@Component({
  selector: 'app-senior-citizen-statistic',
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
  templateUrl: './senior-citizen-statistic.html',
  styleUrl: './senior-citizen-statistic.css',
})
export class SeniorCitizenStatistic implements OnInit, OnDestroy {
  private organizationStore = inject(OrganizationStore);
  private deviceStore = inject(DeviceStore);
  private clinicalStore = inject(ClinicalStore);
  private route = inject(ActivatedRoute);
  private routeSubscription?: Subscription;
  private measurementRefreshTimer?: ReturnType<typeof setInterval>;

  seniorCitizen = computed(() => this.organizationStore.selectedSeniorCitizen());
  deviceId = computed(() => this.seniorCitizen()?.deviceId ?? 0);
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
      const seniorCitizenId = this.seniorCitizen()?.id;
      if (deviceId && deviceId > 0) {
        this.deviceStore.loadAllMeasurementsForDevice(deviceId);
      }
      if (seniorCitizenId) {
        this.clinicalStore.loadPatientThreshold(seniorCitizenId);
      }
    });
  }

  ngOnInit(): void {
    this.loadSeniorCitizen();
    this.measurementRefreshTimer = setInterval(() => {
      const deviceId = this.deviceId();
      if (deviceId > 0) {
        this.deviceStore.loadAllMeasurementsForDevice(deviceId, { showLoading: false });
      }
    }, MEASUREMENT_REFRESH_MS);

    this.routeSubscription = this.route.paramMap.subscribe(() => {
      this.loadSeniorCitizen();
    });
  }

  ngOnDestroy(): void {
    if (this.measurementRefreshTimer) {
      clearInterval(this.measurementRefreshTimer);
    }
    this.routeSubscription?.unsubscribe();
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

  private loadSeniorCitizen(): void {
    const seniorCitizenId = this.route.snapshot.paramMap.get('id');
    if (seniorCitizenId) {
      this.organizationStore.loadSeniorCitizenById(Number(seniorCitizenId));
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
