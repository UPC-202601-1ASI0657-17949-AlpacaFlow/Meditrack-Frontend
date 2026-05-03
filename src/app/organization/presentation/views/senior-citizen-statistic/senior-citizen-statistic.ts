import {Component, computed, inject, OnInit, OnDestroy, effect} from '@angular/core';
import {OrganizationStore} from "../../../application/organization.store";
import {DeviceStore} from "../../../application/device.store";
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

    heartRate = computed<number[]>(() => this.heartRateMeasurements().map(m => m.bpm));

    temperature = computed<number[]>(() => this.temperatureMeasurements().map(m => m.temperature));

    oxygenLevel = computed<number[]>(() => this.oxygenMeasurements().map(m => m.saturation));

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

