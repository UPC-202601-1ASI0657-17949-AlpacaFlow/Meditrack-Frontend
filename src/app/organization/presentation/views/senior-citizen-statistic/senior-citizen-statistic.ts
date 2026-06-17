import {Component, computed, inject, OnInit, OnDestroy, effect} from '@angular/core';
import {OrganizationStore} from "../../../application/organization.store";
import {DeviceStore} from "../../../application/device.store";
import {ClinicalStore} from "../../../../clinical/application/clinical.store";
import {HeartRate} from "../../components/heart-rate/heart-rate";
import {OxygenSaturation} from "../../components/oxygen-saturation/oxygen-saturation";
import {TemperatureRate} from "../../components/temperature-rate/temperature-rate";
import {ActivatedRoute} from "@angular/router";
import {Subscription} from "rxjs";
import {CommonModule} from "@angular/common";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {TranslatePipe} from "@ngx-translate/core";
import {DeviceDegradedBanner} from "../../components/device-degraded-banner/device-degraded-banner";
import { sortByMeasuredAt, VitalTimePoint } from "../../../../shared/utils/vital-chart.utils";

const MEASUREMENT_REFRESH_MS = 15_000;

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
    DeviceDegradedBanner
  ],
  templateUrl: './senior-citizen-statistic.html',
  styleUrl: './senior-citizen-statistic.css'
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

    // Loading state
    loading = computed(() => this.deviceStore.loadingMeasurements());

    // Real-time measurements from device API
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

    constructor() {
        // Effect to automatically load measurements when deviceId changes
        effect(() => {
            const seniorCitizen = this.seniorCitizen();
            const deviceId = this.deviceId();
            
            console.log('📊 SeniorCitizenStatistic Effect:', {
                seniorCitizen: seniorCitizen ? { id: seniorCitizen.id, name: seniorCitizen.fullName, deviceId: seniorCitizen.deviceId } : null,
                deviceId: deviceId
            });
            
            if (deviceId && deviceId > 0) {
                console.log('📊 SeniorCitizenStatistic: Loading measurements for device', deviceId);
                this.deviceStore.loadAllMeasurementsForDevice(deviceId);
            }
            const seniorCitizenId = seniorCitizen?.id;
            if (seniorCitizenId) {
                this.clinicalStore.loadPatientThreshold(seniorCitizenId);
            } else if (seniorCitizen && !deviceId) {
                console.warn('⚠️ SeniorCitizenStatistic: Senior citizen loaded but deviceId is missing or 0', {
                    seniorCitizenId: seniorCitizen.id,
                    deviceId: seniorCitizen.deviceId
                });
            } else if (!seniorCitizen) {
                console.warn('⚠️ SeniorCitizenStatistic: Senior citizen not loaded yet');
            }
        });
    }

    ngOnInit() {
        this.loadSeniorCitizen();
        this.measurementRefreshTimer = setInterval(() => {
            const deviceId = this.deviceId();
            if (deviceId > 0) {
                this.deviceStore.loadAllMeasurementsForDevice(deviceId);
            }
        }, MEASUREMENT_REFRESH_MS);

        this.routeSubscription = this.route.paramMap.subscribe(params => {
            const seniorCitizenId = params.get('id');
            if (seniorCitizenId) {
                this.loadSeniorCitizen();
            }
        });
    }

    private loadSeniorCitizen(): void {
        const seniorCitizenId = this.route.snapshot.paramMap.get('id');
        if (seniorCitizenId) {
            const id = Number(seniorCitizenId);
            console.log(`📊 SeniorCitizenStatistic: Loading senior citizen ${id}`);
            this.organizationStore.loadSeniorCitizenById(id);
            
            // Log after a short delay to see if senior citizen was loaded
            setTimeout(() => {
                const loaded = this.seniorCitizen();
                console.log('📊 SeniorCitizenStatistic: After loadSeniorCitizenById:', {
                    requestedId: id,
                    loaded: loaded ? { id: loaded.id, name: loaded.fullName, deviceId: loaded.deviceId } : null
                });
            }, 100);
        } else {
            console.error('❌ SeniorCitizenStatistic: No senior citizen ID found in route');
        }
    }

    ngOnDestroy(): void {
        if (this.measurementRefreshTimer) {
            clearInterval(this.measurementRefreshTimer);
        }
        if (this.routeSubscription) {
            this.routeSubscription.unsubscribe();
        }
    }
}

