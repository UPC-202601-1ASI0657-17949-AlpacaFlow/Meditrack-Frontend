import {Component, computed, inject, OnInit, OnDestroy, effect} from '@angular/core';
import {OrganizationStore} from "../../../application/organization.store";
import {DeviceStore} from "../../../application/device.store";
import {BloodPressure} from "../../components/blood-pressure/blood-pressure";
import {HeartRate} from "../../components/heart-rate/heart-rate";
import {OxygenSaturation} from "../../components/oxygen-saturation/oxygen-saturation";
import {TemperatureRate} from "../../components/temperature-rate/temperature-rate";
import {ActivatedRoute} from "@angular/router";
import {Subscription} from "rxjs";
import {CommonModule} from "@angular/common";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";

@Component({
  selector: 'app-senior-citizen-statistic',
  standalone: true,
  imports: [
    CommonModule,
    BloodPressure,
    HeartRate,
    OxygenSaturation,
    TemperatureRate,
    MatProgressSpinnerModule
  ],
  templateUrl: './senior-citizen-statistic.html',
  styleUrl: './senior-citizen-statistic.css'
})
export class SeniorCitizenStatistic implements OnInit, OnDestroy {

    private organizationStore = inject(OrganizationStore);
    private deviceStore = inject(DeviceStore);
    private route = inject(ActivatedRoute);
    private routeSubscription?: Subscription;

    seniorCitizen = computed(() => this.organizationStore.selectedSeniorCitizen());
    deviceId = computed(() => this.seniorCitizen()?.deviceId ?? 0);

    // Loading state
    loading = computed(() => this.deviceStore.loadingMeasurements());

    // Real-time measurements from device API
    bloodPressureMeasurements = computed(() => {
        const deviceId = this.deviceId();
        if (!deviceId) return [];
        return this.deviceStore.getBloodPressureMeasurementsForDevice(deviceId)();
    });

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

    // Transform measurements to format expected by chart components
    bloodPressure = computed<[number, number][]>(() => {
        const measurements = this.bloodPressureMeasurements();
        const bp = measurements.map(m => [m.systolic, m.diastolic] as [number, number]);
        // Si no hay datos del backend, usar datos de fallback del senior citizen
        if (bp.length === 0) {
            const sc = this.seniorCitizen();
            const bpData = sc?.signalVitals?.bloodPressure;
            if (!bpData) return [];
            return bpData.map(arr => [arr[0] ?? 0, arr[1] ?? 0] as [number, number]);
        }
        return bp;
    });

    heartRate = computed<number[]>(() => {
        const measurements = this.heartRateMeasurements();
        const hr = measurements.map(m => m.bpm);
        // Si no hay datos del backend, usar datos de fallback del senior citizen
        if (hr.length === 0) {
            const sc = this.seniorCitizen();
            return sc?.signalVitals?.heartRate ?? [];
        }
        return hr;
    });

    temperature = computed<number[]>(() => {
        const measurements = this.temperatureMeasurements();
        const temps = measurements.map(m => m.temperature);
        // Si no hay datos del backend, usar datos de fallback del senior citizen
        if (temps.length === 0) {
            const sc = this.seniorCitizen();
            return sc?.signalVitals?.temperature ?? [];
        }
        return temps;
    });

    oxygenLevel = computed<number[]>(() => {
        const measurements = this.oxygenMeasurements();
        const oxygen = measurements.map(m => m.saturation);
        // Si no hay datos del backend, usar datos de fallback del senior citizen
        if (oxygen.length === 0) {
            const sc = this.seniorCitizen();
            const oxygenData = sc?.signalVitals?.oxygenLevel ?? [];
            // Convertir de { ox: number }[] a number[]
            if (oxygenData.length > 0 && typeof oxygenData[0] === 'object') {
                return oxygenData.map((item: any) => item.ox ?? item);
            }
            return oxygenData;
        }
        return oxygen;
    });

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
            } else if (seniorCitizen && !deviceId) {
                console.warn('⚠️ SeniorCitizenStatistic: Senior citizen loaded but deviceId is missing or 0', {
                    seniorCitizenId: seniorCitizen.id,
                    deviceId: seniorCitizen.deviceId
                });
            } else if (!seniorCitizen) {
                console.warn('⚠️ SeniorCitizenStatistic: Senior citizen not loaded yet');
            }
        });

        // Debug effect to log data
        effect(() => {
            console.log('🔍 Debug - Blood Pressure:', this.bloodPressure());
            console.log('🔍 Debug - Heart Rate:', this.heartRate());
            console.log('🔍 Debug - Temperature:', this.temperature());
            console.log('🔍 Debug - Oxygen Level:', this.oxygenLevel());
            console.log('🔍 Debug - Loading:', this.loading());
        });
    }

    ngOnInit() {
        // Load senior citizen on init
        this.loadSeniorCitizen();
        
        // Subscribe to route changes to reload senior citizen when navigating between different senior citizens
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
        if (this.routeSubscription) {
            this.routeSubscription.unsubscribe();
        }
    }
}

